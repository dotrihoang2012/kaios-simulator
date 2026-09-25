const fs = require('fs');
let js = fs.readFileSync('index.html', 'utf8');

js = js.replace(/this\.savedKbSK = \[\s*bar\.style\.backgroundColor,\s*bar\.style\.backgroundImage,\s*bar\.style\.color\s*\];/g, 
  "this.savedKbSK = [\n          bar.style.backgroundColor,\n          bar.style.backgroundImage,\n          bar.style.color,\n          bar.style.display,\n          document.getElementById('sk-l').innerHTML,\n          document.getElementById('sk-c').innerHTML,\n          document.getElementById('sk-r').innerHTML\n        ];\n        bar.style.display = 'grid';\n        document.getElementById('sk-l').textContent = 'Abc';\n        document.getElementById('sk-c').textContent = '';\n        document.getElementById('sk-r').textContent = '';");

js = js.replace(/bar\.style\.color = this\.savedKbSK\[2\];\s*this\.savedKbSK = null;/g, 
  "bar.style.color = this.savedKbSK[2];\n          bar.style.display = this.savedKbSK[3];\n          document.getElementById('sk-l').innerHTML = this.savedKbSK[4];\n          document.getElementById('sk-c').innerHTML = this.savedKbSK[5];\n          document.getElementById('sk-r').innerHTML = this.savedKbSK[6];\n          this.savedKbSK = null;");

fs.writeFileSync('index.html', js);
console.log('Success');
