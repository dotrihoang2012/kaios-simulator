const fs = require('fs');
let js = fs.readFileSync('web-settings/shared/js/helper/wifi/wifi_helper.js', 'utf8');

// Also check wifi_utils.js
let ujs = fs.readFileSync('web-settings/settings/js/modules/wifi/wifi_utils.js', 'utf8');

ujs = ujs.replace(
  "a.onclick = e => {",
  "li.onclick = e => {\n            onClick(network);\n            e.stopPropagation();\n          };\n          a.onclick = e => {"
);

fs.writeFileSync('web-settings/settings/js/modules/wifi/wifi_utils.js', ujs);
console.log('Success ujs');
