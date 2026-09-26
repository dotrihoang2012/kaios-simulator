const fs = require('fs');
let html = fs.readFileSync('web-settings/settings/elements/device_in_area.html', 'utf8');

const regex = /<div role="menuitem" id="bluetooth-searching" data-l10n-id="search-for-device" class="explanation">\r?\n\s*Searching for devices\?\r?\n\s*<\/div>/m;
const newStr = `<div role="menuitem" id="bluetooth-searching" class="explanation">
             <progress class="small"></progress>
             <span data-l10n-id="search-for-device">Searching for devices...</span>
          </div>`;

if (html.match(regex)) {
    html = html.replace(regex, newStr);
    fs.writeFileSync('web-settings/settings/elements/device_in_area.html', html);
    console.log('Success added progress spinner to bluetooth');
} else {
    console.log('Not found');
}
