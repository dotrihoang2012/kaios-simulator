const fs = require('fs');
let js = fs.readFileSync('settings-host/b2g.js', 'utf8');

const regex = /associate: function \(network\) \{/;
const newStr = "associate: function (network) { if (window.parent && window.parent.showToast) window.parent.showToast('associate called for ' + network.ssid);";

if (js.match(regex)) {
    js = js.replace(regex, newStr);
    fs.writeFileSync('settings-host/b2g.js', js);
    console.log('Success log');
} else {
    console.log('Not found');
}
