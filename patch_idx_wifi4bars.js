const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const regex = /if \(!window\._wifiConnectingPhase\) \{\r?\n\s*window\.setWifiStatus\(wifi\.active \? 'connected' : 'disconnected', 4\);\r?\n\s*\}/m;

if (html.match(regex)) {
    html = html.replace(regex, "");
    fs.writeFileSync('index.html', html);
    console.log('Success removed forced wifi 4 bars from updateSbIcons');
} else {
    console.log('Not found');
}
