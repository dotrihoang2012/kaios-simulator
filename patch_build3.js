const fs = require('fs');
let js = fs.readFileSync('settings-host/build-web.mjs', 'utf8');

js = js.replace(
  "'var a=t.querySelector(\"a\");' +\n           'if(!a&&t.tagName===\"A\")a=t;' +\n           'if(a){' +\n             'a.click();' +\n           '}' +\n           'try{t.click();}catch(e){}' +",
  "'var a=t.querySelector(\"a\");' +\n           'if(!a&&t.tagName===\"A\")a=t;' +\n           'if(a){' +\n             'a.click();' +\n           '}else{' +\n           'try{t.click();}catch(e){}' +\n           '}' +"
);

fs.writeFileSync('settings-host/build-web.mjs', js);
console.log('Success');
