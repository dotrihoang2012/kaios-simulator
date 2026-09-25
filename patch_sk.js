const fs = require('fs');
let js = fs.readFileSync('index.html', 'utf8');

// 1. Patch activate()
const activateOld = "activate(target) {\n      this.target = target;\n      this.active = true;";
const activateNew = "activate(target) {\n      this.target = target;\n      this.active = true;\n      const bar = document.querySelector('.skbar');\n      this.savedKbSK = [\n        bar.style.backgroundColor,\n        bar.style.backgroundImage,\n        bar.style.color\n      ];\n      bar.style.backgroundColor = '#e6e6e6';\n      bar.style.backgroundImage = 'none';\n      bar.style.color = '#323232';";
js = js.replace(activateOld, activateNew);

// 2. Patch deactivate()
const deactivateOld = "deactivate() {\n      this.commitChar();\n      this.active = false;";
const deactivateNew = "deactivate() {\n      this.commitChar();\n      this.active = false;\n      if (this.savedKbSK) {\n        const bar = document.querySelector('.skbar');\n        bar.style.backgroundColor = this.savedKbSK[0];\n        bar.style.backgroundImage = this.savedKbSK[1];\n        bar.style.color = this.savedKbSK[2];\n        this.savedKbSK = null;\n      }";
js = js.replace(deactivateOld, deactivateNew);

// 3. Patch renderSymPage()
const symOld = "setSK(lsk, 'SELECT', \/\, true);\n      document.querySelector('.skbar').style.backgroundColor = '#cccccc';";
const symNew = "setSK(lsk, 'SELECT', \/\, false);\n      const bar = document.querySelector('.skbar');\n      bar.style.backgroundColor = '#e6e6e6';\n      bar.style.backgroundImage = 'none';\n      bar.style.color = '#323232';";
js = js.replace(symOld, symNew);

fs.writeFileSync('index.html', js);
console.log('Success');
