const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const regex = /var kn = \[\];\r?\n\s*try \{ kn = JSON\.parse\(localStorage\.getItem\('kaios\.wifi\.known'\)\|\|'null'\) \|\| \[\]; \} catch\(e\)\{\}\r?\n\s*var hasKnown = kn\.some\(n => n\.ssid === 'KaiOS-Sim' \|\| n\.ssid === 'Home_5G'\);\r?\n\s*if \(hasKnown\) \{[\s\S]*?\} else \{\r?\n\s*window\.setWifiStatus\('disconnected', 0\);\r?\n\s*\}/m;

const newStr = `window.setWifiStatus('disconnected', 0);`;

if (html.match(regex)) {
    html = html.replace(regex, newStr);
    fs.writeFileSync('index.html', html);
    console.log('Success index.html disconnected');
} else {
    console.log('Not found');
}
