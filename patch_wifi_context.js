const fs = require('fs');
let js = fs.readFileSync('web-settings/settings/js/modules/wifi/wifi_context.js', 'utf8');

const regex = /associateNetwork: function\(network, cb\) \{/;
const newStr = "associateNetwork: function(network, cb) {\n        if (window.parent && window.parent.showToast) window.parent.showToast('WifiContext.associateNetwork called');";

if (js.match(regex)) {
    js = js.replace(regex, newStr);
    fs.writeFileSync('web-settings/settings/js/modules/wifi/wifi_context.js', js);
    console.log('Success wifi_context toast');
} else {
    console.log('Not found');
}
