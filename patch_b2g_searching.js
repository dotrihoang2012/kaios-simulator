const fs = require('fs');
let js = fs.readFileSync('settings-host/b2g.js', 'utf8');

// 1. Remove auto-connect on boot
const bootRegex = /if \(w\.enabled\) \{\r?\n\s*var knownAvailableBoot = _availableNetworks\.find\(n => _knownNetworks\.some\(kn => kn\.ssid === n\.ssid\)\);\r?\n\s*if \(knownAvailableBoot\) \{\r?\n\s*w\.connection = \{ status: 'connected', network: Object\.assign\(\{\}, knownAvailableBoot, \{ connected: true, hasInternet: true \}\) \};\r?\n\s*\}\r?\n\s*\}/m;
if (js.match(bootRegex)) {
    js = js.replace(bootRegex, "");
}

// 2. Remove auto-connect on enable
const enableRegex = /var knownAvailable = _availableNetworks\.find\(n => _knownNetworks\.some\(kn => kn\.ssid === n\.ssid\)\);\r?\n\s*if \(knownAvailable\) \{\r?\n[\s\S]*?\} else \{/m;
if (js.match(enableRegex)) {
    js = js.replace(enableRegex, "if (false) { } else {");
}

// 3. Make getNetworks never resolve so it says "Searching..." forever
const getNetworksRegex = /getNetworks: function \(\) \{ \r?\n\s*return req\(_availableNetworks\.map\(n => \{[\s\S]*?\}\)\);\r?\n\s*\}/m;
const newGetNetworks = `getNetworks: function () { 
          var r = { result: [], error: null, onsuccess: null, onerror: null };
          // Never fire onsuccess or onerror -> stays in "Searching..." state
          return r;
        }`;
if (js.match(getNetworksRegex)) {
    js = js.replace(getNetworksRegex, newGetNetworks);
}

fs.writeFileSync('settings-host/b2g.js', js);
console.log('Success b2g.js modifications');
