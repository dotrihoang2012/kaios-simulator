const fs = require('fs');
let js = fs.readFileSync('index.html', 'utf8');

// 1. Revert activate()
const activateOld = "    activate(target) {\n        this.target = target;\n        this.active = true;\n        const bar = document.querySelector('.skbar');\n        this.savedKbSK = [\n          bar.style.backgroundColor,\n          bar.style.backgroundImage,\n          bar.style.color,\n          bar.style.display,\n          document.getElementById('sk-l').innerHTML,\n          document.getElementById('sk-c').innerHTML,\n          document.getElementById('sk-r').innerHTML\n        ];\n        bar.style.display = 'grid';\n        bar.style.backgroundColor = '#e6e6e6';\n        bar.style.backgroundImage = 'none';\n        bar.style.color = '#323232';\n        document.getElementById('sk-l').textContent = 'Abc';\n        document.getElementById('sk-c').textContent = '';\n        document.getElementById('sk-r').textContent = '';\n      this.mode = 'Abc';";

const activateNew = "    activate(target) {\n      this.target = target;\n      this.active = true;\n      this.mode = 'Abc';";

js = js.replace(activateOld, activateNew);

// 2. Revert deactivate()
const deactivateOld = "    deactivate() {\n        this.commitChar();\n        this.active = false;\n        if (this.savedKbSK) {\n          const bar = document.querySelector('.skbar');\n          bar.style.backgroundColor = this.savedKbSK[0];\n          bar.style.backgroundImage = this.savedKbSK[1];\n          bar.style.color = this.savedKbSK[2];\n          bar.style.display = this.savedKbSK[3];\n          document.getElementById('sk-l').innerHTML = this.savedKbSK[4];\n          document.getElementById('sk-c').innerHTML = this.savedKbSK[5];\n          document.getElementById('sk-r').innerHTML = this.savedKbSK[6];\n          this.savedKbSK = null;\n        }";

const deactivateNew = "    deactivate() {\n      this.commitChar();\n      this.active = false;";

js = js.replace(deactivateOld, deactivateNew);

// 3. Update openSymbols() to manage display
const openSymOld = "      this.savedSK = [\n        document.getElementById('sk-l').textContent || document.getElementById('sk-l').innerHTML,\n        document.getElementById('sk-c').textContent || document.getElementById('sk-c').innerHTML,\n        document.getElementById('sk-r').textContent || document.getElementById('sk-r').innerHTML,\n        bar.style.backgroundColor,\n        bar.style.backgroundImage,\n        bar.style.color\n      ];\n      this.renderSymPage();";

const openSymNew = "      this.savedSK = [\n        document.getElementById('sk-l').textContent || document.getElementById('sk-l').innerHTML,\n        document.getElementById('sk-c').textContent || document.getElementById('sk-c').innerHTML,\n        document.getElementById('sk-r').textContent || document.getElementById('sk-r').innerHTML,\n        bar.style.backgroundColor,\n        bar.style.backgroundImage,\n        bar.style.color,\n        bar.style.display\n      ];\n      bar.style.display = 'grid';\n      this.renderSymPage();";

js = js.replace(openSymOld, openSymNew);

// 4. Update closeSymbols() to restore display
const closeSymOld = "      // Restore softkeys\n      if (this.savedSK) {\n        setSK(this.savedSK[0], this.savedSK[1], this.savedSK[2], false); // dummy false\n        const bar = document.querySelector('.skbar');\n        bar.style.backgroundColor = this.savedSK[3];\n        bar.style.backgroundImage = this.savedSK[4];\n        bar.style.color = this.savedSK[5];\n        this.savedSK = null;\n      }";

const closeSymNew = "      // Restore softkeys\n      if (this.savedSK) {\n        setSK(this.savedSK[0], this.savedSK[1], this.savedSK[2], false); // dummy false\n        const bar = document.querySelector('.skbar');\n        bar.style.backgroundColor = this.savedSK[3];\n        bar.style.backgroundImage = this.savedSK[4];\n        bar.style.color = this.savedSK[5];\n        bar.style.display = this.savedSK[6];\n        this.savedSK = null;\n      }";

js = js.replace(closeSymOld, closeSymNew);

fs.writeFileSync('index.html', js);
console.log('Success');
