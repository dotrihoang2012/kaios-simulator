const fs = require('fs');
let js = fs.readFileSync('index.html', 'utf8');

js = js.replace(/sbWifi\.style\.display = 'flex';/g, "sbWifi.style.display = '';");

fs.writeFileSync('index.html', js);
console.log('Success flex');
