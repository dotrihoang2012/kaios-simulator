const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const regexToggleOn = /if \(i === 3\) window\.setWifiStatus\('disconnected', 0\);/m;

const newToggleOn = `if (i === 3) {
            var kn = [];
            try { kn = JSON.parse(localStorage.getItem('kaios.wifi.known')||'null') || []; } catch(e){}
            var hasKnown = kn.some(n => n.ssid === 'KaiOS-Sim' || n.ssid === 'Home_5G');
            if (hasKnown) {
              window._wifiConnectingPhase = true;
              window.setWifiStatus('connecting', 0);
              setTimeout(() => {
                window._wifiConnectingPhase = false;
                window.setWifiStatus('connected', 4);
                window.showToast('Wi-Fi Connected');
              }, 1500);
            } else {
              window.setWifiStatus('disconnected', 0);
            }
          }`;

if (html.match(regexToggleOn)) {
    html = html.replace(regexToggleOn, newToggleOn);
    fs.writeFileSync('index.html', html);
    console.log('Success index.html smart wifi toggle');
} else {
    // maybe we reverted it, so the old code is there!
    const regexOld = /if \(i === 3\) \{\r?\n\s*window\._wifiConnectingPhase = true;\r?\n\s*window\.setWifiStatus\('connecting', 0\);\r?\n\s*setTimeout\(\(\) => \{\r?\n\s*window\._wifiConnectingPhase = false;\r?\n\s*window\.setWifiStatus\('connected', 4\);\r?\n\s*window\.showToast\('Wi-Fi Connected'\);\r?\n\s*\}, 1500\);\r?\n\s*\}/m;
    if (html.match(regexOld)) {
        html = html.replace(regexOld, newToggleOn);
        fs.writeFileSync('index.html', html);
        console.log('Success index.html smart wifi toggle (from old)');
    } else {
        console.log('Not found');
    }
}
