const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// The current HTML for home screen clock:
// <span class=\"clockDigi--time\" id=\"cm2\" data-icon=\"numeric_0_rounded_semibold\"></span></span><span class=\"clock-ampm\" id=\"campm\" style=\"display:none\"></span>

html = html.replace(
  /<span class="clockDigi--time" id="cm2" data-icon="numeric_0_rounded_semibold"><\/span><\/span><span class="clock-ampm" id="campm" style="display:none"><\/span>/,
  '<span class="clockDigi--time" id="cm2" data-icon="numeric_0_rounded_semibold"></span>\n            </span>'
);

html = html.replace(
  /<div class="clock-wrap">\s*<div class="clockDigi-container">/,
  '<div class="clock-wrap">\n          <div class="clock-ampm" id="campm" style="display:none"></div>\n          <div class="clockDigi-container">'
);

fs.writeFileSync('index.html', html);
