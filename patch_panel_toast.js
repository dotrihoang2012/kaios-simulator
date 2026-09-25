const fs = require('fs');
let js = fs.readFileSync('web-settings/settings/js/panels/wifi_auth/panel.js', 'utf8');

const regex = /method: \(\) => \{\n\s*const itemWifiList = document\.querySelector\(/;
const newStr = "method: () => {\n            if (window.parent && window.parent.showToast) window.parent.showToast('Connect button clicked!');\n            const itemWifiList = document.querySelector(";

if (js.match(regex)) {
    js = js.replace(regex, newStr);
    fs.writeFileSync('web-settings/settings/js/panels/wifi_auth/panel.js', js);
    console.log('Success panel');
} else {
    console.log('Not found');
}
