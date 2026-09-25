const fs = require('fs');
let js = fs.readFileSync('index.html', 'utf8');

const oldStr = "setSK(lsk, 'SELECT', \/\, true);\n      document.querySelector('.skbar').style.backgroundColor = '#cccccc';";
const newStr = "setSK(lsk, 'SELECT', \/\, false);\n      const bar = document.querySelector('.skbar');\n      bar.style.backgroundColor = '#e6e6e6';\n      bar.style.backgroundImage = 'none';\n      bar.style.color = '#323232';";

if (js.includes(oldStr)) {
  js = js.replace(oldStr, newStr);
  fs.writeFileSync('index.html', js);
  console.log('Success string');
} else {
  console.log('Failed string matching');
  // Try line by line replacement
  const lines = js.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("setSK(lsk, 'SELECT'") && lines[i].includes('true')) {
       lines[i] = lines[i].replace('true', 'false');
       lines[i+1] = "      const bar = document.querySelector('.skbar');\n      bar.style.backgroundColor = '#e6e6e6';\n      bar.style.backgroundImage = 'none';\n      bar.style.color = '#323232';";
       js = lines.join('\n');
       fs.writeFileSync('index.html', js);
       console.log('Success lines');
       break;
    }
  }
}
