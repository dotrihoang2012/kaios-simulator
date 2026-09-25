const fs = require('fs');
let js = fs.readFileSync('settings-host/build-web.mjs', 'utf8');

const oldCode = "'var a=t.querySelector(\"a\");' +\n           'if(!a&&t.tagName===\"A\")a=t;' +\n           'if(a){' +\n             'a.click();' +\n           '}' +\n           'try{t.click();}catch(e){}' +";

const newCode = "'var a=t.querySelector(\"a\");' +\n           'if(!a&&t.tagName===\"A\")a=t;' +\n           'if(a){' +\n             'a.click();' +\n           '}else{' +\n           'try{t.click();}catch(e){}' +\n           '}' +";

if (js.includes(oldCode)) {
  js = js.replace(oldCode, newCode);
  fs.writeFileSync('settings-host/build-web.mjs', js);
  console.log('Success string');
} else {
  console.log('Not found string');
}
