const fs = require('fs');
let js = fs.readFileSync('web-settings/settings/js/panels/wifi_auth/panel.js', 'utf8');

const regex = /function connectNetwork\(\) \{\n\s*const \{ network \} = elements;/;
const newStr = "function connectNetwork() {\n        if (window.parent && window.parent.showToast) window.parent.showToast('connectNetwork called, key: ' + WifiHelper.getKeyManagement(elements.network));\n        const { network } = elements;";

if (js.match(regex)) {
    js = js.replace(regex, newStr);
    fs.writeFileSync('web-settings/settings/js/panels/wifi_auth/panel.js', js);
    console.log('Success connectNetwork');
} else {
    console.log('Not found');
}
