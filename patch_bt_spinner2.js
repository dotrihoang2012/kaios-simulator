const fs = require('fs');
let html = fs.readFileSync('web-settings/settings/elements/device_in_area.html', 'utf8');

const target = '<div role="menuitem" id="bluetooth-searching" data-l10n-id="search-for-device" class="explanation">\r\n             Searching for devices\r\n          </div>';
const newStr = `<div role="menuitem" id="bluetooth-searching" class="explanation">
             <progress class="small"></progress>
             <span data-l10n-id="search-for-device">Searching for devices...</span>
          </div>`;

// Or simpler regex:
const regex = /<div role="menuitem" id="bluetooth-searching"[^>]*>[\s\S]*?<\/div>/;
if (html.match(regex)) {
    html = html.replace(regex, newStr);
    fs.writeFileSync('web-settings/settings/elements/device_in_area.html', html);
    console.log('Success regex replace');
} else {
    console.log('Regex Not found');
}
