const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const oldTick = html.substring(html.indexOf('function tick() {'), html.indexOf('tick();\r\n'));
const oldTickLock = html.substring(html.indexOf('function tickLock(silent = false) {'), html.indexOf('  function doRestart() {'));

const newTick = `function tick() {
    const now = new Date();
    let h = now.getHours(), m = now.getMinutes();
    let ampm = '';
    if (window.__simHour12) {
      ampm = h >= 12 ? ' PM' : ' AM';
      h = h % 12 || 12;
    }
    const hs = window.__simHour12 ? (h < 10 ? ' ' + h : '' + h) : pad(now.getHours());
    const ms = pad(m);
    document.getElementById('sb-time').textContent = window.__simHour12 ? (h + ':' + ms + ampm) : (pad(now.getHours()) + ':' + ms);
    document.getElementById('cdate').textContent = DAYS[now.getDay()] + '\\n' + MONS[now.getMonth()] + ' ' + now.getDate();
    const campm = document.getElementById('campm');
    if (window.__simHour12) {
      campm.style.display = 'block';
      campm.textContent = ampm.trim();
      if (hs[0] === ' ') {
        document.getElementById('ch1').style.display = 'none';
      } else {
        document.getElementById('ch1').style.display = '';
        animDigit('ch1', 'numeric_' + hs[0] + '_rounded_semibold');
      }
    } else {
      campm.style.display = 'none';
      document.getElementById('ch1').style.display = '';
      animDigit('ch1', 'numeric_' + hs[0] + '_rounded_semibold');
    }
    animDigit('ch2', 'numeric_' + hs[1] + '_rounded_semibold');
    animDigit('cm1', 'numeric_' + ms[0] + '_rounded_semibold');
    animDigit('cm2', 'numeric_' + ms[1] + '_rounded_semibold');
    if (view === 'lock') tickLock();
  }
`;

const newTickLock = `function tickLock(silent = false) {
    const now = new Date();
    let h = now.getHours(), m = now.getMinutes();
    if (window.__simHour12) {
      h = h % 12 || 12;
    }
    const hs = window.__simHour12 ? (h < 10 ? ' ' + h : '' + h) : pad(now.getHours());
    const ms = pad(now.getMinutes());
    const setDig = silent ? (id, icon) => { const el = document.getElementById(id); if (el) el.dataset.icon = icon; } : animDigit;
    if (window.__simHour12 && hs[0] === ' ') {
      document.getElementById('lc-h1').style.display = 'none';
    } else {
      document.getElementById('lc-h1').style.display = '';
      setDig('lc-h1', 'numeric_' + hs[0] + '_rounded_semibold');
    }
    setDig('lc-h2', 'numeric_' + hs[1] + '_rounded_semibold');
    setDig('lc-m1', 'numeric_' + ms[0] + '_rounded_semibold');
    setDig('lc-m2', 'numeric_' + ms[1] + '_rounded_semibold');
    document.getElementById('lock-date').textContent = DAYS[now.getDay()].slice(0,3) + ', ' + MONS[now.getMonth()] + ' ' + now.getDate();
    _lockSyncStatusbar();
  }
  `;

html = html.replace(oldTick, newTick);
html = html.replace(oldTickLock, newTickLock);

const appendScript = `
<script>
(function() {
  function getSettings() {
    try { return JSON.parse(localStorage.getItem('__kaiSettings') || '{}'); } catch(e) { return {}; }
  }
  
  function applySettings(settings) {
    const sbWifi = document.getElementById('sb-wifi');
    if (sbWifi) sbWifi.style.display = settings['wifi.enabled'] !== false ? 'flex' : 'none';
    
    const sbBt = document.getElementById('sb-bluetooth');
    if (sbBt) sbBt.style.display = settings['bluetooth.enabled'] ? 'flex' : 'none';
    
    const sbAirplane = document.getElementById('sb-airplane');
    if (sbAirplane) {
      if (settings['airplaneMode.status'] === 'enabled') {
        sbAirplane.style.display = 'flex';
        if (sbWifi) sbWifi.style.display = 'none';
        if (sbBt) sbBt.style.display = 'none';
      } else {
        sbAirplane.style.display = 'none';
      }
    }
    
    const sbSound = document.getElementById('sb-sound');
    if (sbSound) {
      if (settings['audio.volume.notification'] === 0) {
        sbSound.style.display = 'flex';
        sbSound.setAttribute('data-icon', settings['vibration.enabled'] ? 'vibration' : 'mute');
      } else {
        sbSound.style.display = 'none';
      }
    }
    
    const screen = document.getElementById('screen');
    if (screen) {
      let brightness = settings['screen.brightness'];
      if (typeof brightness !== 'number') brightness = 1.0;
      const filterVal = 0.4 + (brightness * 0.6); 
      screen.style.filter = 'brightness(' + filterVal + ')';
    }
    
    const isHour12 = settings['locale.hour12'] === true || settings['locale.hour12'] === 'true';
    if (window.__simHour12 !== isHour12) {
      window.__simHour12 = isHour12;
      if (typeof tick === 'function') tick();
    }
  }
  
  applySettings(getSettings());
  
  window.addEventListener('storage', function(e) {
    if (e.key === '__kaiSettings') applySettings(getSettings());
  });
})();
</script>
</body>`;

const lastIndex = html.lastIndexOf('</body>');
html = html.substring(0, lastIndex) + appendScript + html.substring(lastIndex + 7);
fs.writeFileSync('index.html', html);
