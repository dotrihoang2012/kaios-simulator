const fs = require('fs');
let js = fs.readFileSync('index.html', 'utf8');

const activateOld = "    activate(target) {\n        this.target = target;\n        this.active = true;\n        const bar = document.querySelector('.skbar');\n        this.savedKbSK = [\n          bar.style.backgroundColor,\n          bar.style.backgroundImage,\n          bar.style.color\n        ];\n        bar.style.backgroundColor = '#e6e6e6';\n        bar.style.backgroundImage = 'none';\n        bar.style.color = '#323232';\n      this.mode = 'Abc';";

const activateNew = "    activate(target) {\n        this.target = target;\n        this.active = true;\n        const bar = document.querySelector('.skbar');\n        this.savedKbSK = [\n          bar.style.backgroundColor,\n          bar.style.backgroundImage,\n          bar.style.color,\n          bar.style.display,\n          document.getElementById('sk-l').innerHTML,\n          document.getElementById('sk-c').innerHTML,\n          document.getElementById('sk-r').innerHTML\n        ];\n        bar.style.display = 'grid';\n        bar.style.backgroundColor = '#e6e6e6';\n        bar.style.backgroundImage = 'none';\n        bar.style.color = '#323232';\n        document.getElementById('sk-l').textContent = 'Abc';\n        document.getElementById('sk-c').textContent = '';\n        document.getElementById('sk-r').textContent = '';\n      this.mode = 'Abc';";

const deactivateOld = "    deactivate() {\n        this.commitChar();\n        this.active = false;\n        if (this.savedKbSK) {\n          const bar = document.querySelector('.skbar');\n          bar.style.backgroundColor = this.savedKbSK[0];\n          bar.style.backgroundImage = this.savedKbSK[1];\n          bar.style.color = this.savedKbSK[2];\n          this.savedKbSK = null;\n        }";

const deactivateNew = "    deactivate() {\n        this.commitChar();\n        this.active = false;\n        if (this.savedKbSK) {\n          const bar = document.querySelector('.skbar');\n          bar.style.backgroundColor = this.savedKbSK[0];\n          bar.style.backgroundImage = this.savedKbSK[1];\n          bar.style.color = this.savedKbSK[2];\n          bar.style.display = this.savedKbSK[3];\n          document.getElementById('sk-l').innerHTML = this.savedKbSK[4];\n          document.getElementById('sk-c').innerHTML = this.savedKbSK[5];\n          document.getElementById('sk-r').innerHTML = this.savedKbSK[6];\n          this.savedKbSK = null;\n        }";

if (js.includes(activateOld)) {
  js = js.replace(activateOld, activateNew);
  js = js.replace(deactivateOld, deactivateNew);
  fs.writeFileSync('index.html', js);
  console.log('Success');
} else {
  console.log('Not found');
}
