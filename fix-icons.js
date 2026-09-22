const fs = require('fs');
const file = 'D:/desktop/Tools/platform-tools/KaiOS/index.html';
let code = fs.readFileSync(file, 'utf8');

// Fix .app-icon::after
code = code.replace(
  ".app-icon::after {\n      content: '';\n      position: absolute; top: var(--statusbar-height); bottom: var(--softkeybar-height); left: 0; right: 0;",
  ".app-icon::after {\n      content: '';\n      position: absolute; top: 0; left: 0; right: 0; bottom: 0;"
);
code = code.replace(
  ".app-icon::after {\r\n      content: '';\r\n      position: absolute; top: var(--statusbar-height); bottom: var(--softkeybar-height); left: 0; right: 0;",
  ".app-icon::after {\r\n      content: '';\r\n      position: absolute; top: 0; left: 0; right: 0; bottom: 0;"
);

// Fix #splash-screen
code = code.replace(
  "#splash-screen {\n      position: absolute; top: 0; left: 0; right: 0; bottom: 0;",
  "#splash-screen {\n      position: absolute; top: var(--statusbar-height); bottom: var(--softkeybar-height); left: 0; right: 0;"
);
code = code.replace(
  "#splash-screen {\r\n      position: absolute; top: 0; left: 0; right: 0; bottom: 0;",
  "#splash-screen {\r\n      position: absolute; top: var(--statusbar-height); bottom: var(--softkeybar-height); left: 0; right: 0;"
);

fs.writeFileSync(file, code);
console.log('Fixed!');
