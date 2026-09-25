const fs = require('fs');
let js = fs.readFileSync('index.html', 'utf8');

const regexAct = /activate\(target\) \{[\s\S]*?this\.mode = 'Abc';/m;
const newAct = "activate(target) {\n      this.target = target;\n      this.active = true;\n      this.mode = 'Abc';";

const regexDeact = /deactivate\(\) \{[\s\S]*?this\.savedKbSK = null;\n        \}/m;
const newDeact = "deactivate() {\n      this.commitChar();\n      this.active = false;";

js = js.replace(regexAct, newAct);
js = js.replace(regexDeact, newDeact);

fs.writeFileSync('index.html', js);
console.log('Success');
