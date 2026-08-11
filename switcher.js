/* ============================================================================
 * Přepínač staveb M-SILNICE  (verze 1.0)
 * Vlož do libovolné appky jediným řádkem před </body>:
 *   <script src="https://pripravar.github.io/OZ-JIH/switcher.js" defer></script>
 *
 * Seznam staveb bere z jednoho zdroje: https://pripravar.github.io/OZ-JIH/stavby.json
 * Novou stavbu přidáš JEN tam a přepínač se aktualizuje ve všech appkách.
 *
 * Umístění pilulky lze změnit (dřív než se načte skript):
 *   <script>window.MSW_POS='top'</script>   // 'top' (výchozí) | 'bl' | 'br' | 'tl' | 'tr'
 * ========================================================================== */
(function () {
  if (window.__msw_loaded) return;            // pojistka proti dvojímu vložení
  window.__msw_loaded = true;

  var JSON_URL = 'https://pripravar.github.io/OZ-JIH/stavby.json';
  var HUB_URL  = 'https://pripravar.github.io/OZ-JIH/';
  var POS = (window.MSW_POS || 'top');

  function norm(u) {
    try {
      var a = new URL(u, location.href);
      return (a.origin + a.pathname).replace(/index\.html?$/i, '').replace(/\/+$/, '/') ;
    } catch (e) { return String(u || ''); }
  }
  var HERE = norm(location.href);

  var posCss = {
    top: 'top:6px;left:50%;transform:translateX(-50%);',
    tl:  'top:8px;left:8px;',
    tr:  'top:8px;right:8px;',
    bl:  'bottom:8px;left:8px;',
    br:  'bottom:8px;right:8px;'
  }[POS] || 'top:6px;left:50%;transform:translateX(-50%);';

  var css =
    '#msw-btn{position:fixed;' + posCss + 'z-index:2147483000;display:flex;align-items:center;gap:6px;' +
    'font:600 13px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;' +
    'color:#fff;background:rgba(15,32,54,.92);border:1px solid rgba(255,255,255,.18);' +
    'padding:8px 12px;border-radius:999px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35);' +
    '-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);user-select:none;-webkit-tap-highlight-color:transparent}' +
    '#msw-btn:active{transform:' + (POS === 'top' ? 'translateX(-50%) scale(.96)' : 'scale(.96)') + '}' +
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

  function build(data) {
    var style = el('style'); style.textContent = css; document.head.appendChild(style);

    var btn = el('div', { id: 'msw-btn', role: 'button', 'aria-label': 'Přepnout stavbu' },
      '🗺️ <span>Stavby</span> <span class="msw-ca">▾</span>');
    document.body.appendChild(btn);

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
    btn.addEventListener('click', open);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    panel.querySelector('.msw-x').addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  function boot() {
    fetch(JSON_URL, { cache: 'no-cache' })
      .then(function (r) { return r.json(); })
      .then(build)
      .catch(function () { /* offline / bez sítě: přepínač se prostě nezobrazí */ });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
