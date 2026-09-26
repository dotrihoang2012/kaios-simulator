const fs = require('fs');
let js = fs.readFileSync('settings-host/build-web.mjs', 'utf8');

js = js.replace("data.push({'$i': 'scanning', '$v': 'Searching...'});", "data.push({'$i': 'scanning', '$v': 'Searching...'});\n      data.push({'$i': 'search-for-device', '$v': 'Searching for devices...'});");

fs.writeFileSync('settings-host/build-web.mjs', js);
console.log('Done');
