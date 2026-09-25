const fs = require('fs');
let js = fs.readFileSync('settings-host/b2g.js', 'utf8');
js = js.replace(/window\.parent\.showToast\('wifi-4', 'Connected to KaiOS-sim'\);/g, "window.parent.showToast('Connected to KaiOS-sim');");
fs.writeFileSync('settings-host/b2g.js', js);
