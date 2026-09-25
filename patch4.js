const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Move campm out of clockDigi-container back to above it
html = html.replace(
  /<span class="clockDigi--time" id="cm2" [^>]+><\/span><\/span><span class="clock-ampm" id="campm"[^>]*><\/span>/,
  '<span class="clockDigi--time" id="cm2" data-icon="numeric_0_rounded_semibold"></span>\n            </span>'
);

// We need to add campm BEFORE the FIRST clockDigi-container
html = html.replace(
  /<div class="clock-wrap">\s*<div class="clockDigi-container">/,
  '<div class="clock-wrap">\n          <div class="clock-ampm" id="campm" style="display:none"></div>\n          <div class="clockDigi-container">'
);

// 2. Fix CSS
// Find existing .clock-ampm block
html = html.replace(
  /\.clock-ampm\s*\{[^}]+\}/,
  \.clock-ampm {
      font-size: 1.4rem;
      font-weight: 700;
      line-height: 1.4rem;
      text-align: right;
      padding-right: 0.5rem;
      margin-bottom: -0.2rem;
    }\
);

// Lock screen ampm css - might not exist yet if python failed, let's just append it to #lock-clock {
if (!html.includes('#lock-clock .clock-ampm')) {
  html = html.replace(
    /#lock-clock \{/,
    \#lock-clock .clock-ampm {
      font-size: 1.8rem;
      font-weight: 700;
      margin-left: 0.6rem;
      align-self: flex-end;
      padding-bottom: 0.6rem;
    }
    #lock-clock {\
  );
} else {
  html = html.replace(
    /#lock-clock \.clock-ampm\s*\{[^}]+\}/,
    \#lock-clock .clock-ampm {
      font-size: 1.8rem;
      font-weight: 700;
      margin-left: 0.6rem;
      align-self: flex-end;
      padding-bottom: 0.6rem;
    }\
  );
}

fs.writeFileSync('index.html', html);
