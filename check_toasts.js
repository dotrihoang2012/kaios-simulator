const fs = require('fs');
let js = fs.readFileSync('web-settings/settings/js/panels/wifi_auth/panel.js', 'utf8');
if (js.includes('connectNetwork called')) {
    console.log('Toasts are in panel.js');
} else {
    console.log('Toasts MISSING from panel.js');
}
