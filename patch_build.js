const fs = require('fs');
let js = fs.readFileSync('settings-host/build-web.mjs', 'utf8');

const oldCode = "'var a=t.querySelector(\"a[href],a.menu-item\");' +";
const newCode = "'var a=t.querySelector(\"a\");' +";

js = js.replace(oldCode, newCode);
fs.writeFileSync('settings-host/build-web.mjs', js);
console.log('Success');
