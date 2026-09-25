const fs = require('fs');
let js = fs.readFileSync('index.html', 'utf8');

js = js.replace(/activate\(target\)\s*\{\s*this\.target = target;\s*this\.active = true;/, 
  "activate(target) {\n      this.target = target;\n      this.active = true;\n      const bar = document.querySelector('.skbar');\n      this.savedKbSK = [\n        bar.style.backgroundColor,\n        bar.style.backgroundImage,\n        bar.style.color\n      ];\n      bar.style.backgroundColor = '#e6e6e6';\n      bar.style.backgroundImage = 'none';\n      bar.style.color = '#323232';");

js = js.replace(/deactivate\(\)\s*\{\s*this\.commitChar\(\);\s*this\.active = false;/, 
  "deactivate() {\n      this.commitChar();\n      this.active = false;\n      if (this.savedKbSK) {\n        const bar = document.querySelector('.skbar');\n        bar.style.backgroundColor = this.savedKbSK[0];\n        bar.style.backgroundImage = this.savedKbSK[1];\n        bar.style.color = this.savedKbSK[2];\n        this.savedKbSK = null;\n      }");

js = js.replace(/setSK\(lsk,\s*'SELECT',\s*\\\$\\{page \+ 1\\}\/\\\$\\{totalPages\\},\s*true\);\s*document\.querySelector\('\.skbar'\)\.style\.backgroundColor = '#cccccc';/, 
  "setSK(lsk, 'SELECT', \/\, false);\n      const bar = document.querySelector('.skbar');\n      bar.style.backgroundColor = '#e6e6e6';\n      bar.style.backgroundImage = 'none';\n      bar.style.color = '#323232';");

fs.writeFileSync('index.html', js);
console.log('Success');
