/* ============================================================================
 * Přepínač staveb M-SILNICE  (verze 1.2 — opt-in podle role + výjimka)
 * Vlož do libovolné appky jediným řádkem před </body>:
 *   <script src="https://pripravar.github.io/OZ-JIH/switcher.js" defer></script>
 *
 * DŮLEŽITÉ: přepínač se sám NEZOBRAZÍ. Až když ho appka po přihlášení pustí:
 *   window.MSWInit({ role: 'admin', override: null });
 *     role     : 'admin' | 'sub' | 'investor' | 'tds' | ...  (role uživatele v appce)
 *     override : true  = vždy ukázat (ruční výjimka v právech)
 *                false = vždy skrýt  (ruční výjimka v právech)
 *                null/undefined = rozhodne role (SUB/investor/TDS neuvidí, ostatní ano)
 *   window.MSWHide();   // schová (např. při odhlášení)
 * Lze volat opakovaně (po změně uživatele) — přepínač se přepočítá.
 *
 * Seznam staveb bere z jednoho zdroje: https://pripravar.github.io/OZ-JIH/stavby.json
 * Novou stavbu přidáš JEN tam a přepínač se aktualizuje ve všech appkách.
 *
 * Chování tlačítka:
 *  - lze TÁHNOUT (jako beruška), pozice se uloží (localStorage) a drží se ve všech appkách
 *  - lehce průhledné, při dotyku/najetí plné
 *  - výchozí pozice: levý okraj, spodní polovina
 *  - krátký ťuk (bez posunu) = otevře menu
 * ========================================================================== */
(function () {
  if (window.__msw_loaded) return;            // pojistka proti dvojímu vložení
  window.__msw_loaded = true;

  var JSON_URL  = 'https://pripravar.github.io/OZ-JIH/stavby.json';
  var HUB_URL   = 'https://pripravar.github.io/OZ-JIH/';
  var STORE_KEY = 'msw_pos_v1';               // uložená pozice tlačítka
  var MARGIN    = 8;                          // odstup od okrajů
  var BLOKOVANE_ROLE = ['sub', 'investor', 'tds'];  // tyto role přepínač NEvidí (bez výjimky)

  /* Rozhodnutí, zda uživatel smí vidět přepínač. */
  function smiVidet(role, override) {
    if (override === true)  return true;      // ruční výjimka: povolit
    if (override === false) return false;     // ruční výjimka: zakázat
    var r = String(role || '').toLowerCase();
    return BLOKOVANE_ROLE.indexOf(r) === -1;  // jinak podle role
  }

  function norm(u) {
    try {
      var a = new URL(u, location.href);
      return (a.origin + a.pathname).replace(/index\.html?$/i, '').replace(/\/+$/, '/');
    } catch (e) { return String(u || ''); }
  }
  var HERE = norm(location.href);

  var css =
    '#msw-btn{position:fixed;left:8px;top:70%;z-index:2147483000;display:flex;align-items:center;gap:6px;' +
    'font:600 13px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;' +
    'color:#fff;background:rgba(15,32,54,.62);border:1px solid rgba(255,255,255,.22);' +
    'padding:8px 12px;border-radius:999px;cursor:grab;box-shadow:0 4px 14px rgba(0,0,0,.30);' +
    '-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);opacity:.7;' +
    'user-select:none;-webkit-user-select:none;touch-action:none;-webkit-tap-highlight-color:transparent;' +
    'transition:opacity .15s ease}' +
    '#msw-btn:hover{opacity:1}' +
    '#msw-btn.msw-drag{opacity:1;cursor:grabbing;box-shadow:0 8px 22px rgba(0,0,0,.45)}' +
    '#msw-btn .msw-ca{opacity:.7;font-size:11px}' +
    '#msw-ov{position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.45);display:none;' +
    'align-items:flex-start;justify-content:center;padding:14vh 14px 14px}' +
    '#msw-ov.open{display:flex}' +
    '#msw-panel{width:100%;max-width:360px;max-height:72vh;overflow:auto;background:#0f2036;' +
    'border:1px solid rgba(255,255,255,.14);border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.5);' +
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:#fff}' +
    '#msw-panel .msw-h{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;' +
    'border-bottom:1px solid rgba(255,255,255,.12);font-weight:800;font-size:15px}' +
    '#msw-panel .msw-x{cursor:pointer;font-size:20px;line-height:1;opacity:.7;padding:2px 6px}' +
    '#msw-panel a{display:flex;align-items:center;gap:12px;padding:13px 16px;text-decoration:none;color:#fff;' +
    'border-bottom:1px solid rgba(255,255,255,.07)}' +
    '#msw-panel a:last-child{border-bottom:0}' +
    '#msw-panel a:active{background:rgba(255,255,255,.06)}' +
    '#msw-panel a.msw-here{background:rgba(90,150,220,.22)}' +
    '#msw-panel a.msw-here .msw-nm::after{content:" •  tady jsi";font-weight:600;color:#8ec5ff;font-size:12px}' +
    '#msw-panel a.msw-hub{background:rgba(255,255,255,.05);font-weight:700}' +
    '#msw-panel .msw-ico{font-size:20px;width:24px;text-align:center;flex:0 0 auto}' +
    '#msw-panel .msw-nm{font-weight:700;font-size:14px}' +
    '#msw-panel .msw-sec{padding:12px 16px 4px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#9fb4d4}';

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }

  /* ---- pozice + drag ---------------------------------------------------- */
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function applyPos(btn, left, top) {
    var w = btn.offsetWidth || 120, h = btn.offsetHeight || 36;
    left = clamp(left, MARGIN, window.innerWidth  - w - MARGIN);
    top  = clamp(top,  MARGIN, window.innerHeight - h - MARGIN);
    btn.style.left = left + 'px';
    btn.style.top  = top + 'px';
    return { left: left, top: top };
  }

  function loadPos() {
    try { var p = JSON.parse(localStorage.getItem(STORE_KEY)); if (p && typeof p.left === 'number') return p; } catch (e) {}
    return null;
  }
  function savePos(p) { try { localStorage.setItem(STORE_KEY, JSON.stringify(p)); } catch (e) {} }

  function setupDrag(btn, onTap) {
    var startX, startY, baseL, baseT, moved, dragging, pid;
    var THRESH = 5;

    btn.addEventListener('pointerdown', function (e) {
      dragging = true; moved = false; pid = e.pointerId;
      startX = e.clientX; startY = e.clientY;
      var r = btn.getBoundingClientRect(); baseL = r.left; baseT = r.top;
      try { btn.setPointerCapture(pid); } catch (_) {}
      e.preventDefault();
    });

    btn.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      if (!moved && (Math.abs(dx) > THRESH || Math.abs(dy) > THRESH)) { moved = true; btn.classList.add('msw-drag'); }
      if (moved) applyPos(btn, baseL + dx, baseT + dy);
    });

    function end() {
      if (!dragging) return;
      dragging = false;
      btn.classList.remove('msw-drag');
      try { btn.releasePointerCapture(pid); } catch (_) {}
      if (moved) {
        var r = btn.getBoundingClientRect();
        savePos({ left: r.left, top: r.top });
      } else {
        onTap();   // krátký ťuk = otevřít menu
      }
    }
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointercancel', end);
  }

  var MOD = { built: false, booting: false, btn: null, ov: null, wantShow: false };

  function showBtn() {
    if (!MOD.btn) return;
    MOD.btn.style.display = '';
    var r = MOD.btn.getBoundingClientRect();
    if (r.width) applyPos(MOD.btn, r.left, r.top);
  }
  function hideBtn() {
    if (MOD.btn) MOD.btn.style.display = 'none';
    if (MOD.ov) MOD.ov.classList.remove('open');
  }

  function build(data) {
    var style = el('style'); style.textContent = css; document.head.appendChild(style);

    var btn = el('div', { id: 'msw-btn', role: 'button', 'aria-label': 'Přepnout stavbu (lze táhnout)' },
      '🗺️ <span>Stavby</span> <span class="msw-ca">▾</span>');
    btn.style.display = 'none';                // skryté, dokud appka nepovolí přes MSWInit()
    document.body.appendChild(btn);

    // pozice: uložená, jinak výchozí = levý okraj, spodní polovina
    var saved = loadPos();
    var pos = saved || { left: MARGIN, top: Math.round(window.innerHeight * 0.70) };
    applyPos(btn, pos.left, pos.top);
    window.addEventListener('resize', function () {
      if (btn.style.display === 'none') return;
      var r = btn.getBoundingClientRect(); applyPos(btn, r.left, r.top);
    });

    var ov = el('div', { id: 'msw-ov' });
    var panel = el('div', { id: 'msw-panel' });
    ov.appendChild(panel);
    document.body.appendChild(ov);

    var html = '<div class="msw-h"><span>Přepnout stavbu</span><span class="msw-x" role="button" aria-label="Zavřít">✕</span></div>';
    html += '<a class="msw-hub" href="' + HUB_URL + '"><span class="msw-ico">🏠</span><span class="msw-nm">Rozcestník (všechny aplikace)</span></a>';

    var stavby = (data && data.stavby ? data.stavby : []).filter(function (s) { return s.status === 'live' && s.url; });
    html += '<div class="msw-sec">Stavby</div>';
    stavby.forEach(function (s) {
      var here = norm(s.url) === HERE;
      html += '<a class="' + (here ? 'msw-here' : '') + '" href="' + (here ? '#' : s.url) + '"' + (here ? ' onclick="return false"' : '') + '>' +
        '<span class="msw-ico">' + (s.ico || '🗺️') + '</span><span class="msw-nm">' + s.name + '</span></a>';
    });
    panel.innerHTML = html;

    function open() { ov.classList.add('open'); }
    function close() { ov.classList.remove('open'); }
    setupDrag(btn, open);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    panel.querySelector('.msw-x').addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

    MOD.btn = btn; MOD.ov = ov; MOD.built = true; MOD.booting = false;
    if (MOD.wantShow) showBtn(); else hideBtn();
  }

  function boot() {
    if (MOD.built || MOD.booting) return;
    MOD.booting = true;
    fetch(JSON_URL, { cache: 'no-cache' })
      .then(function (r) { return r.json(); })
      .then(build)
      .catch(function () { MOD.booting = false; /* offline: přepínač se prostě nezobrazí */ });
  }

  /* ---- Veřejné API pro appky ------------------------------------------- *
   * Appka volá po přihlášení, jakmile zná roli/práva uživatele:
   *   window.MSWInit({ role: 'sub', override: null });
   * Vrací true/false = zda uživatel přepínač uvidí.                          */
  window.MSWInit = function (opts) {
    opts = opts || {};
    var allow = smiVidet(opts.role, opts.override);
    MOD.wantShow = allow;
    if (allow) { MOD.built ? showBtn() : boot(); }
    else if (MOD.built) { hideBtn(); }
    return allow;
  };
  window.MSWHide = function () { MOD.wantShow = false; if (MOD.built) hideBtn(); };

  /* Pokud appka rozhodla dřív, než se tenhle skript stihl načíst, nastaví
     window.MSWState = { role, override } a my ho tu převezmeme. */
  if (window.MSWState) { try { window.MSWInit(window.MSWState); } catch (e) {} }
})();
