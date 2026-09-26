const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const regexToggleOn = /if \(i === 3\) \{\r?\n\s*window\._wifiConnectingPhase = true;\r?\n\s*window\.setWifiStatus\('connecting', 0\);\r?\n\s*setTimeout\(\(\) => \{\r?\n\s*window\._wifiConnectingPhase = false;\r?\n\s*window\.setWifiStatus\('connected', 4\);\r?\n\s*window\.showToast\('Wi-Fi Connected'\);\r?\n\s*\}, 1500\);\r?\n\s*\}/m;

if (html.match(regexToggleOn)) {
    html = html.replace(regexToggleOn, "");
    fs.writeFileSync('index.html', html);
    console.log('Success removed fake wifi sequence in index.html');
} else {
    console.log('Not found');
}
