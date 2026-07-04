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
  const inj = '<script>window.__bwcDEF="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAGqADAAQAAAABAAAAGgAAAABMybYKAAACM0lEQVRIDa3Uv4saURAH8DsPjSIIaSxCuEKIBotYWMRCm1icTWzO6mxCbCyuC8Q/IATSpbESIW0CVhYHQkBsbPwDFIIgHAcBRdf9Hc/dyXeOGJZlY3Z1Fx7umzczH95jfScnDg8RvXMI+x8CxM+1/51tHVmZz+fiZrOp25b8nTKUSCRosVgo2+32jb/dLd0YwpSSySQtl0vGrizL/r3uIMbS6TStVisFsUv/hD+drBBjmUyG1us1Y699xewQY9lsliRJYuzCN8wJYiyXy5GMB+uvfMH+BTFWKBRIURTG8kdj+yDGisUiqaoqIe/lUdj/IMZKpRJjInKzB2NuIMbK5TIf4xr5Lw7C3EKMVSoVE5iAmrRnzAvEWLVaNYAtUffME+YVCgaD1Gg0DFzCP1GbcI3tg0KhEA0GA302mwm4B2U0/2UYxlbTNNE0zR+o/YbxyBVmhwKBAKVSqYeLlo+q0+nIaP4ZeU8xoq6aOiVZIT6WbrerDIdDmREe+XyeRFG8dar1FNtB4XCY+v2+jKY3OBrBuqvpdMr/oeOuIoZisRiNRiMZF+lXTM90Xf/UbDb13a7q9bopCMKNpx3Ykxkaj8cikBZeT3kdv+f4hNVIJPJwfNFolG8GDfEn9nrXcxTz89FegB18r9Vqfz+KVquFE9U+2PNcz4G8d0pG/GIymYhYo3g8Tu12+x5f3x3iAaf8g2NoeIrju+v1ehJ2ouIj+YLY84Mb7itE47cYDYzH+/Lsa78BgVUCjf/Bb48AAAAASUVORK5CYII=";window.__bwcPTR="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA4ZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMDY3IDc5LjE1Nzc0NywgMjAxNS8wMy8zMC0yMzo0MDo0MiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDoxZTdiZmZmMy02NWViLTQ5YzQtODRiYi1kZTNmZmExZDU4Y2QiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RkUzOENENjU1NUI2MTFFNjhBQTY5MTE4NjE1REVCOEUiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RkUzOENENjQ1NUI2MTFFNjhBQTY5MTE4NjE1REVCOEUiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUgKE1hY2ludG9zaCkiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDozY2M3NzUwMy01YTM5LTQ1YzYtOWVhMS1iZTlmOTEzZWIwYzMiIHN0UmVmOmRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDowNmI1YTA1Mi05ZGJjLTExNzktODBmMi1mMzIzZWQxYjUwZjMiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz5Zp5DDAAABuElEQVR42syWMWvCQBTHk5ai2MXNTUq+hh9DcNOlg9AvYMfuHTK1Q6CDe+lisFBcpBU7iGAKdnNKwUINpkFIcXh9F/rkTK+5M7XSP/zNweXul3e+9xJNk+sMfY8G9CP6nJ8EACWrQNhdkMvlgMY8bFugKJJOpwNM/X4fuMg2AukSENBmJF1fLdHjc0na03akJNDhrkAHuwLJ5KAvfgOvoa/Rr5TOvLgUJ7+gn9EWOqua3jXBRmsgwzBgOBzCaDSCfD4vArOSKMtAUd1YlgXT6RR83/8GGgwGq3Gz2QTXdWE8HkcFnclkeGA5CSQ8KhX1er3oapomgew/AZHm8zmB/KTOIOwEqtUf7x64Tv9XnSFSsVjcCkh6dKk2VTg6j/3MZrPUkDAMafiRdHSsjrRWq5Ua5Hne2kP/pGMWMav+xWIBadRutym9b/n0jkd0hb6bTCZavV5PFVG32107nSQZ6Hf2VI1GY6NogiCAQqFAEZVUvhlK1CWq1SrgHyyFLJdLqFQqwmOTZTGDBWyhbdtSkOM4BHlDH236FXQqem1IfCl6H+1LQA9f9ZBlTUJy7xP6Bjc9EU1+CjAAHiLfZiALOxAAAAAASUVORK5CYII=";(function(){var B='+B+',P='+P+';function abs(u){try{return new URL(u,B).href;}catch{return u;}}function px(u){if(!u||/^(data:|#|javascript:|blob:)/.test(u))return u;return P+encodeURIComponent(abs(u));}var oF=window.fetch;window.fetch=function(i,o){if(typeof i==="string")i=px(i);else if(i&&i.url)i=new Request(px(i.url),i);return oF.call(this,i,o);};var oO=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){return oO.apply(this,[m,px(String(u))].concat([].slice.call(arguments,2)));};try{var d=Object.getOwnPropertyDescriptor(Location.prototype,"href");if(d&&d.set){var oS=d.set;Object.defineProperty(Location.prototype,"href",{get:d.get,set:function(u){oS.call(this,px(String(u)));},configurable:true});}}catch(e){}try{var l=window.location;l.assign=(function(f){return function(u){f(px(u));};})(l.assign.bind(l));l.replace=(function(f){return function(u){f(px(u));};})(l.replace.bind(l));}catch(e){}var oPS=history.pushState,oRS=history.replaceState;history.pushState=function(s,t,u){return oPS.call(this,s,t,u?px(String(u)):u);};history.replaceState=function(s,t,u){return oRS.call(this,s,t,u?px(String(u)):u);};document.addEventListener("submit",function(e){var f=e.target;if(!f||f.method.toLowerCase()==="post")return;e.preventDefault();e.stopPropagation();try{var pA=new URL(f.action||location.href);var oU=pA.searchParams.get("url")||B;var tU=new URL(abs(oU));new URLSearchParams(new FormData(f)).forEach(function(v,k){tU.searchParams.set(k,v);});location.href=P+encodeURIComponent(tU.href);}catch(err){}},true);window.addEventListener("message",function(e){if(!e.data)return;if(e.data.type==="bw-scroll"){var el=document.scrollingElement||document.documentElement;if(e.data.dir==="top")el.scrollTop=0;else el.scrollTop=el.scrollHeight;}if(e.data.type==="bw-scroll-by"){window.scrollBy(e.data.dx||0,e.data.dy||0);}if(e.data.type==="bw-click"){try{var el=document.elementFromPoint(e.data.x,e.data.y);if(el){el.focus&&el.focus();el.click&&el.click();}}catch(err){}}if(e.data.type==="bw-cursor"){var cc=document.getElementById("__bwcur__");if(e.data.show){var sz=e.data.sz||26;if(!cc){cc=document.createElement("img");cc.id="__bwcur__";cc.style.cssText="position:fixed;z-index:2147483647;pointer-events:none;";(document.documentElement||document.body).appendChild(cc);}cc.style.left=e.data.x+"px";cc.style.top=e.data.y+"px";cc.style.width=sz+"px";cc.style.height=sz+"px";cc.style.display="block";var pt=false;try{var n=document.elementFromPoint(e.data.x,e.data.y);while(n){var cs=(getComputedStyle(n).cursor||"");if(cs==="pointer"){pt=true;break;}var tg=n.tagName;if(tg==="A"||tg==="BUTTON"||tg==="SELECT"||tg==="TEXTAREA"||(tg==="INPUT"&&n.type!=="hidden")){pt=true;break;}n=n.parentElement;}}catch(err){}var k=pt?"p":"d";if(cc.getAttribute("data-k")!==k){cc.src=(pt?window.__bwcPTR:window.__bwcDEF);cc.setAttribute("data-k",k);}}else if(cc){cc.parentNode&&cc.parentNode.removeChild(cc);}}if(e.data.type==="bw-history"){if(e.data.dir==="back")history.back();else history.forward();}if(e.data.type==="bw-overlay"){var o=document.getElementById("__bwmo__");if(e.data.show&&!o){o=document.createElement("div");o.id="__bwmo__";o.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:2147483647;pointer-events:none;";document.documentElement.appendChild(o);}else if(!e.data.show&&o){o.remove();}}});(function(){var s=document.createElement("style");s.textContent="::-webkit-scrollbar{width:0 !important;height:0 !important;display:none !important}html{scrollbar-width:none !important}";(document.head||document.documentElement).appendChild(s);})();function _bwPT(){try{parent.postMessage({type:"bw-title",title:document.title,href:location.href},"*");}catch(e){}}if(document.readyState==="complete")_bwPT();else window.addEventListener("load",_bwPT);document.addEventListener("DOMContentLoaded",_bwPT);window.addEventListener("pagehide",function(){try{parent.postMessage({type:"bw-nav-start"},"*");}catch(e){}});window.open=function(u){if(u)location.href=u;return null;};document.addEventListener("click",function(e){var a=e.target&&e.target.closest?e.target.closest("a[target]"):null;if(a&&a.target&&a.target!=="_self")a.target="_self";},true);})();<\/script>';
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
