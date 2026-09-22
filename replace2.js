const fs = require('fs');
const file = 'D:/desktop/Tools/platform-tools/KaiOS/index.html';
let lines = fs.readFileSync(file, 'utf8').split('\n');
let start = -1, end = -1;
for(let i=0; i<lines.length; i++) {
  if (lines[i].includes("if (view === 'app-open') {")) start = i;
  if (start !== -1 && lines[i].includes("if (view === 'apps' && isMoving)")) { end = i; break; }
}
if(start !== -1 && end !== -1) {
  lines.splice(start, end - start, 
    "  if (view === 'app-open') {\r",
    "    animateCloseApp('view-open-app', () => {\r",
    "      const _sb = document.getElementById('statusbar');\r",
    "      _sb.classList.remove('bw-sb');\r",
    "      _sb.style.background = '';\r",
    "      _sb.style.color = '';\r",
    "      const bar = document.querySelector('.skbar');\r",
    "      bar.style.backgroundColor = '';\r",
    "      bar.style.backgroundImage = '';\r",
    "      bar.style.color = '';\r",
    "      if (fromApps) {\r",
    "        view = 'apps';\r",
    "        if (appViewMode === 'list')        buildList();\r",
    "        else if (appViewMode === 'single') buildSingle();\r",
    "        else { setSK('', 'Select', 'Options', false); lbl('Apps — ' + (curApp()?.name || '')); }\r",
    "      } else {\r",
    "        goHome();\r",
    "      }\r",
    "    });\r",
    "    return;\r",
    "  }\r"
  );
  fs.writeFileSync(file, lines.join('\n'));
  console.log('Success');
} else {
  console.log('Not found');
}
