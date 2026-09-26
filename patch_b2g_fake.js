const fs = require('fs');
let js = fs.readFileSync('settings-host/b2g.js', 'utf8');

const regex = /if \(on\) \{\r?\n\s*wifi\.connection\.status = 'connecting';\r?\n\s*if \(typeof wifi\.onstatuschange === 'function'\) wifi\.onstatuschange\(\{ status: 'connecting', network: wifi\.connection\.network \}\);\r?\n\s*if \(window\.parent && typeof window\.parent\.setWifiStatus === 'function'\) window\.parent\.setWifiStatus\('connecting', 0\);\r?\n\s*setTimeout\(function\(\) \{\r?\n\s*wifi\.connection\.status = 'connected';\r?\n\s*if \(typeof wifi\.onstatuschange === 'function'\) wifi\.onstatuschange\(\{ status: 'connected', network: wifi\.connection\.network \}\);\r?\n\s*if \(typeof wifi\.onwifihasinternet === 'function'\) wifi\.onwifihasinternet\(\{ network: wifi\.connection\.network \}\);\r?\n\s*if \(window\.parent && typeof window\.parent\.setWifiStatus === 'function'\) window\.parent\.setWifiStatus\('connected', 4\);\r?\n\s*if \(window\.parent && typeof window\.parent\.showToast === 'function'\) \{\r?\n\s*window\.parent\.showToast\('Wi-Fi Connected'\);\r?\n\s*\}\r?\n\s*\}, 1500\);\r?\n\s*\} else \{/m;

const newStr = `if (on) {
        var knownAvailable = _availableNetworks.find(n => _knownNetworks.some(kn => kn.ssid === n.ssid));
        if (knownAvailable) {
          wifi.connection.status = 'connecting';
          wifi.connection.network = knownAvailable;
          if (typeof wifi.onstatuschange === 'function') wifi.onstatuschange({ status: 'connecting', network: knownAvailable });
          if (window.parent && typeof window.parent.setWifiStatus === 'function') window.parent.setWifiStatus('connecting', 0);
          setTimeout(function() {
            wifi.connection.status = 'connected';
            knownAvailable.connected = true;
            knownAvailable.hasInternet = true;
            if (typeof wifi.onstatuschange === 'function') wifi.onstatuschange({ status: 'connected', network: knownAvailable });
            if (typeof wifi.onwifihasinternet === 'function') wifi.onwifihasinternet({ network: knownAvailable });
            if (window.parent && typeof window.parent.setWifiStatus === 'function') window.parent.setWifiStatus('connected', 4);
            if (window.parent && typeof window.parent.showToast === 'function') {
              window.parent.showToast('Wi-Fi Connected');
            }
          }, 1500);
        } else {
          wifi.connection.status = 'disconnected';
          wifi.connection.network = null;
          if (typeof wifi.onstatuschange === 'function') wifi.onstatuschange({ status: 'disconnected', network: null });
        }
      } else {`;

if (js.match(regex)) {
    js = js.replace(regex, newStr);
    fs.writeFileSync('settings-host/b2g.js', js);
    console.log('Success fixed fake wifi sequence in b2g.js');
} else {
    console.log('Not found');
}
