const fs = require('fs');
let js = fs.readFileSync('settings-host/b2g.js', 'utf8');

js = js.replace(/security: 'WPA2'/g, "security: 'WPA2-PSK'");

fs.writeFileSync('settings-host/b2g.js', js);
console.log('Success');
