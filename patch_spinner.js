const fs = require('fs');
let html = fs.readFileSync('web-settings/settings/elements/wifi_available_networks.html', 'utf8');

const regex = /<div class="searching_icon">\r?\n\s*<span class="searching-text"/m;
const newStr = `<div class="searching_icon">
        <progress></progress>
        <span class="searching-text"`;

if (html.match(regex)) {
    html = html.replace(regex, newStr);
    fs.writeFileSync('web-settings/settings/elements/wifi_available_networks.html', html);
    console.log('Success added progress spinner');
} else {
    console.log('Not found');
}
