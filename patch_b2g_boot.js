const fs = require('fs');
let js = fs.readFileSync('settings-host/b2g.js', 'utf8');

const regex = /if \(w\.enabled && _knownNetworks\.some\(kn => kn\.ssid === 'KaiOS-Sim'\)\) \{\r?\n\s*w\.connection = \{ status: 'connected', network: Object\.assign\(\{\}, _availableNetworks\[0\], \{ connected: true, hasInternet: true \}\) \};\r?\n\s*\}/m;

const newStr = `if (w.enabled) {
        var knownAvailableBoot = _availableNetworks.find(n => _knownNetworks.some(kn => kn.ssid === n.ssid));
        if (knownAvailableBoot) {
          w.connection = { status: 'connected', network: Object.assign({}, knownAvailableBoot, { connected: true, hasInternet: true }) };
        }
      }`;

if (js.match(regex)) {
    js = js.replace(regex, newStr);
    fs.writeFileSync('settings-host/b2g.js', js);
    console.log('Success dynamic boot connection');
} else {
    console.log('Not found');
}
