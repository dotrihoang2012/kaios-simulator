const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Home screen AM/PM
html = html.replace(
  /\.clock-ampm \{\s*font-size: 1\.4rem;\s*font-weight: 700;\s*text-align: right;\s*padding-right: 0\.2rem;\s*margin-bottom: -0\.2rem;\s*\}/,
  \.clock-ampm {
      font-size: 1.4rem;
      font-weight: 700;
      text-align: right;
      padding-right: 0.2rem;
      margin-bottom: 0.4rem;
      margin-top: -0.2rem;
    }\
);

// Lock screen AM/PM
html = html.replace(
  /#lock-clock \.clock-ampm \{\s*font-size: 1\.8rem;\s*font-weight: 700;\s*margin-left: 0\.6rem;\s*align-self: flex-end;\s*padding-bottom: 0\.8rem;\s*\}/,
  \#lock-clock .clock-ampm {
      font-size: 1.8rem;
      font-weight: 700;
      margin-left: 0.6rem;
      align-self: flex-end;
      padding-bottom: 0.3rem;
    }\
);

fs.writeFileSync('index.html', html);
