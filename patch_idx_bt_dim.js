const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const regex = /sbBt\.style\.display = '';\r?\n\s*window\._btConnectTimer = null;/m;
const newStr = `sbBt.style.display = '';
        sbBt.style.opacity = '0.5';
        window._btConnectTimer = null;`;

if (html.match(regex)) {
    html = html.replace(regex, newStr);
    fs.writeFileSync('index.html', html);
    console.log('Success added dim opacity');
} else {
    console.log('Not found');
}
