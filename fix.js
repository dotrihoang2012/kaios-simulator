const fs = require('fs');
const file = 'D:/desktop/Tools/platform-tools/KaiOS/index.html';
let code = fs.readFileSync(file, 'utf8');

const replacement =   if (view === 'app-open') {
    animateCloseApp('view-open-app', () => {
      const _sb = document.getElementById('statusbar');
      _sb.classList.remove('bw-sb');
      _sb.style.background = '';
      _sb.style.color = '';
      const bar = document.querySelector('.skbar');
      bar.style.backgroundColor = '';
      bar.style.backgroundImage = '';
      bar.style.color = '';
      if (fromApps) {
        view = 'apps';
        if (appViewMode === 'list')        buildList();
        else if (appViewMode === 'single') buildSingle();
        else { setSK('', 'Select', 'Options', false); lbl('Apps — ' + (curApp()?.name || '')); }
      } else {
        goHome();
      }
    });
    return;
  };

code = code.replace(/if \(view === 'app-open'\) \{[\s\S]*?goHome\(\);\s*\}\s*return;\s*\}/, replacement);
fs.writeFileSync(file, code);
