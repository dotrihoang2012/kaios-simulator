// KaiOS Simulator — Local CORS Proxy
// Runs in Electron renderer (nodeIntegration:true); skipped on GitHub Pages
(function() {
if (typeof require === 'undefined') return;

const http = require('http'), https = require('https'), zlib = require('zlib');
const PORT = 8899, BASE = 'http://localhost:' + PORT;

function toProxy(u, base) {
  if (!u) return u;
  const s = u.trim();
  if (!s || /^(data:|#|javascript:|blob:|mailto:|tel:)/.test(s)) return s;
  try { return BASE + '/proxy?url=' + encodeURIComponent(new URL(s, base).href); } catch(e) { return s; }
}

function rewriteHtml(html, base) {
  html = html.replace(/((?:href|src|action|srcset|data-src)\s*=\s*)(["'])([^"']*)\2/gi, (_, a, q, v) => a + q + toProxy(v, base) + q);
  html = html.replace(/url\(\s*(["']?)([^)"']+)\1\s*\)/gi, (_, q, v) => 'url(' + q + toProxy(v, base) + q + ')');
  const P = JSON.stringify(BASE + '/proxy?url='), B = JSON.stringify(base);
  const inj = '<script>(function(){var B='+B+',P='+P+';function abs(u){try{return new URL(u,B).href;}catch{return u;}}function px(u){if(!u||/^(data:|#|javascript:|blob:)/.test(u))return u;return P+encodeURIComponent(abs(u));}var oF=window.fetch;window.fetch=function(i,o){if(typeof i==="string")i=px(i);else if(i&&i.url)i=new Request(px(i.url),i);return oF.call(this,i,o);};var oO=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){return oO.apply(this,[m,px(String(u))].concat([].slice.call(arguments,2)));};try{var d=Object.getOwnPropertyDescriptor(Location.prototype,"href");if(d&&d.set){var oS=d.set;Object.defineProperty(Location.prototype,"href",{get:d.get,set:function(u){oS.call(this,px(String(u)));},configurable:true});}}catch(e){}try{var l=window.location;l.assign=(function(f){return function(u){f(px(u));};})(l.assign.bind(l));l.replace=(function(f){return function(u){f(px(u));};})(l.replace.bind(l));}catch(e){}var oPS=history.pushState,oRS=history.replaceState;history.pushState=function(s,t,u){return oPS.call(this,s,t,u?px(String(u)):u);};history.replaceState=function(s,t,u){return oRS.call(this,s,t,u?px(String(u)):u);};document.addEventListener("submit",function(e){var f=e.target;if(!f||f.method.toLowerCase()==="post")return;e.preventDefault();e.stopPropagation();try{var pA=new URL(f.action||location.href);var oU=pA.searchParams.get("url")||B;var tU=new URL(abs(oU));new URLSearchParams(new FormData(f)).forEach(function(v,k){tU.searchParams.set(k,v);});location.href=P+encodeURIComponent(tU.href);}catch(err){}},true);window.addEventListener("message",function(e){if(!e.data)return;if(e.data.type==="bw-scroll"){var el=document.scrollingElement||document.documentElement;if(e.data.dir==="top")el.scrollTop=0;else el.scrollTop=el.scrollHeight;}if(e.data.type==="bw-scroll-by"){window.scrollBy(e.data.dx||0,e.data.dy||0);}if(e.data.type==="bw-overlay"){var o=document.getElementById("__bwmo__");if(e.data.show&&!o){o=document.createElement("div");o.id="__bwmo__";o.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:2147483647;pointer-events:none;";document.documentElement.appendChild(o);}else if(!e.data.show&&o){o.remove();}}});})();<\/script>';
  return html.replace(/(<head[^>]*>)/i, '$1' + inj);
}

function proxyReq(targetUrl, req, res) {
  try {
    const u = new URL(BASE + req.url), extra = new URLSearchParams(u.search);
    extra.delete('url');
    if ([...extra.keys()].length > 0) { const t = new URL(targetUrl); extra.forEach((v,k) => t.searchParams.set(k,v)); targetUrl = t.href; }
  } catch(e) {}
  let target; try { target = new URL(targetUrl); } catch(e) { res.writeHead(400); res.end('Invalid URL'); return; }
  const lib = target.protocol === 'https:' ? https : http;
  const opts = {
    hostname: target.hostname,
    port: target.port || (target.protocol === 'https:' ? 443 : 80),
    path: target.pathname + target.search,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Mobile; KaiOS 3.0; rv:85.0) Gecko/85.0 Firefox/85.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Cookie': 'CONSENT=YES+; SOCS=CAESEwgDEgk0ODc4MDkxMzYaAmVuIAEaBgiA_LqYBg=='
    }
  };
  lib.get(opts, pRes => {
    if ([301,302,303,307,308].includes(pRes.statusCode) && pRes.headers.location) {
      res.writeHead(302, { 'Location': BASE+'/proxy?url='+encodeURIComponent(new URL(pRes.headers.location, targetUrl).href), 'Access-Control-Allow-Origin': '*' });
      res.end(); return;
    }
    const isHtml = (pRes.headers['content-type']||'').includes('text/html'), enc = pRes.headers['content-encoding'];
    const hdrs = {...pRes.headers};
    ['x-frame-options','content-security-policy','content-security-policy-report-only','content-encoding'].forEach(h => delete hdrs[h]);
    hdrs['access-control-allow-origin'] = '*';
    if (!isHtml) { res.writeHead(pRes.statusCode, hdrs); pRes.pipe(res); return; }
    const chunks = [];
    const stream = enc==='gzip' ? pRes.pipe(zlib.createGunzip()) : enc==='deflate' ? pRes.pipe(zlib.createInflate()) : pRes;
    stream.on('data', c => chunks.push(c));
    stream.on('end', () => { let html = Buffer.concat(chunks).toString('utf8'); html = rewriteHtml(html, targetUrl); delete hdrs['content-length']; res.writeHead(pRes.statusCode, hdrs); res.end(html); });
    stream.on('error', () => { res.writeHead(502); res.end('Decompress error'); });
  }).on('error', e => { res.writeHead(502); res.end('Proxy error: ' + e.message); });
}

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const u = new URL(req.url, BASE);
  let targetUrl = u.searchParams.get('url');
  if (!targetUrl) {
    try { const refU = new URL(req.headers['referer']||''); const base = refU.searchParams.get('url'); if (base) targetUrl = new URL(req.url, base).href; } catch(e) {}
  }
  if (!targetUrl) { res.writeHead(400); res.end('Missing url'); return; }
  proxyReq(targetUrl, req, res);
}).listen(PORT, '127.0.0.1', () => { BW_WEB_PROXY = BASE; });
})();
