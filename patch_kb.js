const fs = require('fs');
let js = fs.readFileSync('settings-host/b2g.js', 'utf8');
const kbLogic = fs.readFileSync('patch_kb_snippet.js', 'utf8');

if (!js.includes('SimKeyboard Integration')) {
  js = js + '\n' + kbLogic;
  fs.writeFileSync('settings-host/b2g.js', js);
  console.log('Success');
} else {
  console.log('Already patched');
}
