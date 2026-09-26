const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const regex = /<span class="sb-icon" id="sb-bluetooth" data-icon="bluetooth" style="display:none"><\/span>/;
const newStr = `<span class="sb-icon" id="sb-bluetooth" data-icon="bluetooth" style="display:none; opacity: 0.5;"></span>`;

if (html.match(regex)) {
    html = html.replace(regex, newStr);
    fs.writeFileSync('index.html', html);
    console.log('Success added opacity to bluetooth icon');
} else {
    console.log('Not found');
}
