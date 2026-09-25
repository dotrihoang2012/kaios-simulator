const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const oldLines = [
'function tickLock(silent = false) {',
'  const now = new Date();',
'  const hs = pad(now.getHours()), ms = pad(now.getMinutes());',
'  const setDig = silent',
'    ? (id, icon) => { const el = document.getElementById(id); if (el) el.dataset.icon = icon; }',
'    : animDigit;',
'  setDig(\'lc-h1\', \'numeric_\' + hs[0] + \'_rounded_semibold\');'
];

const newText = unction tickLock(silent = false) {
  const now = new Date();
  let h = now.getHours(), m = now.getMinutes();
  let ampm = '';
  if (window.__simHour12) {
    ampm = h >= 12 ? ' PM' : ' AM';
    h = h % 12 || 12;
  }
  const hs = window.__simHour12 ? (h < 10 ? ' ' + h : '' + h) : pad(now.getHours());
  const ms = pad(m);
  const setDig = silent
    ? (id, icon) => { const el = document.getElementById(id); if (el) el.dataset.icon = icon; }
    : animDigit;
  const lcampm = document.getElementById('lcampm');
  if (window.__simHour12) {
    if (lcampm) { lcampm.style.display = 'block'; lcampm.textContent = ampm.trim(); }
    if (hs[0] === ' ') {
      document.getElementById('lc-h1').style.display = 'none';
    } else {
      document.getElementById('lc-h1').style.display = '';
      setDig('lc-h1', 'numeric_' + hs[0] + '_rounded_semibold');
    }
  } else {
    if (lcampm) lcampm.style.display = 'none';
    document.getElementById('lc-h1').style.display = '';
    setDig('lc-h1', 'numeric_' + hs[0] + '_rounded_semibold');
  };

let matchIndex = -1;
let matchedOldText = '';
for(let e of ['\\n', '\\r\\n']) {
  let oldTextStr = oldLines.join(e.replace(/\\\\/g, '\\'));
  matchIndex = html.indexOf(oldTextStr);
  if(matchIndex !== -1) {
    matchedOldText = oldTextStr;
    break;
  }
}

if(matchIndex !== -1) {
  html = html.replace(matchedOldText, newText);
  fs.writeFileSync('index.html', html);
  console.log('Success');
} else {
  console.log('Failed');
}
