const fs = require('fs');
const file = 'D:/desktop/Tools/platform-tools/KaiOS/index.html';
let code = fs.readFileSync(file, 'utf8');

const regex = /if \(view === 'app-open'\) \{\s+const _sb = document\.getElementById\('statusbar'\);\s+_sb\.classList\.remove\('bw-sb'\);\s+_sb\.style\.background = '';\s+_sb\.style\.color = '';\s+const bar = document\.querySelector\('\.skbar'\);\s+bar\.style\.backgroundColor = '';\s+bar\.style\.backgroundImage = '';\s+bar\.style\.color = '';\s+document\.getElementById\('view-open-app'\)\.classList\.remove\('visible'\);\s+if \(fromApps\) \{\s+view = 'apps';\s+if \(appViewMode === 'list'\)\s+buildList\(\);\s+else if \(appViewMode === 'single'\) buildSingle\(\);\s+else \{ setSK\('', 'Select', 'Options', false\); lbl\('Apps — ' \+ \(curApp\(\)\?\.name \|\| ''\)\); \}\s+\} else \{\s+goHome\(\);\s+\}\s+return;\s+\}/;

const replace = `if (view === 'app-open') {
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
  }`;

if (regex.test(code)) {
  code = code.replace(regex, replace);
  fs.writeFileSync(file, code);
  console.log('Success via regex');
} else {
  console.log('Not found via regex');
}
