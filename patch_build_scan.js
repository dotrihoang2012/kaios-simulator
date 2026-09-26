const fs = require('fs');
let js = fs.readFileSync('settings-host/build-web.mjs', 'utf8');

const regex = /data\.push\(\{'\\$i': 'shortStatus-associated', '\\$v': 'Obtaining an IP address\.\.\.'\}\);/;
const newStr = `data.push({'$i': 'shortStatus-associated', '$v': 'Obtaining an IP address...'});
      data.push({'$i': 'scanning', '$v': 'Searching...'});`;

// wait, let's just append it to the l10n injection block.
if (js.includes("data.push({'$i': 'securedBy', '$v': 'Secured by {{capabilities}}'});")) {
    js = js.replace("data.push({'$i': 'securedBy', '$v': 'Secured by {{capabilities}}'});", 
                    "data.push({'$i': 'securedBy', '$v': 'Secured by {{capabilities}}'});\n      data.push({'$i': 'scanning', '$v': 'Searching...'});");
    fs.writeFileSync('settings-host/build-web.mjs', js);
    console.log('Success added scanning translation');
} else {
    console.log('Not found');
}
