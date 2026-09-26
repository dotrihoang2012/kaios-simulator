const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const regex = /if \(i === 2\) \{ IS_TILES\[3\]\.active = false; IS_TILES\[5\]\.active = false; \}/;

const newToggleOn = `if (i === 2) { IS_TILES[3].active = false; IS_TILES[5].active = false; }
          
          if (i === 3) {
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

if (html.match(regex)) {
    html = html.replace(regex, newToggleOn);
    fs.writeFileSync('index.html', html);
    console.log('Success inserted smart wifi toggle');
} else {
    console.log('Not found');
}
