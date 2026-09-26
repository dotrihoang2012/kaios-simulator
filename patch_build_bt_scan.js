const fs = require('fs');
let js = fs.readFileSync('settings-host/build-web.mjs', 'utf8');

const regex = /data\.push\(\{'\\$i': 'scanning', '\\$v': 'Searching\.\.\.'\}\);/;
const newStr = `data.push({'$i': 'scanning', '$v': 'Searching...'});
      data.push({'$i': 'search-for-device', '$v': 'Searching for devices...'});`;

if (js.match(regex)) {
    js = js.replace(regex, newStr);
    fs.writeFileSync('settings-host/build-web.mjs', js);
    console.log('Success added search-for-device');
} else {
    console.log('Not found');
}
