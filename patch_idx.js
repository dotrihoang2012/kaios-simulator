const fs = require('fs');
let js = fs.readFileSync('index.html', 'utf8');

const regex = /const sbWifi = document\.getElementById\('sb-wifi'\);[\s\S]*?(?=const sbBt = document\.getElementById\('sb-bluetooth'\);)/m;

const new_func = "window.setWifiStatus = function(status, level) {\n" +
"    const sbWifi = document.getElementById('sb-wifi');\n" +
"    const sbWifiConn = document.getElementById('sb-wifi-connecting');\n" +
"    if (status === 'disconnected' || !status) {\n" +
"      sbWifi.style.display = 'none';\n" +
"      sbWifi.setAttribute('data-icon', '');\n" +
"      sbWifi.classList.remove('connecting');\n" +
"      sbWifiConn.style.display = 'none';\n" +
"    } else if (status === 'connecting') {\n" +
"      sbWifi.style.display = 'flex';\n" +
"      sbWifi.setAttribute('data-icon', '');\n" +
"      sbWifi.classList.add('connecting');\n" +
"      sbWifiConn.style.display = 'inline';\n" +
"    } else if (status === 'connected') {\n" +
"      sbWifi.style.display = 'flex';\n" +
"      sbWifi.setAttribute('data-icon', 'wifi-' + Math.min(4, Math.max(1, level)));\n" +
"      sbWifi.classList.remove('connecting');\n" +
"      sbWifiConn.style.display = 'none';\n" +
"    }\n" +
"  };\n\n";

if (js.match(regex)) {
    js = js.replace(regex, new_func);
    fs.writeFileSync('index.html', js);
    console.log('Success');
} else {
    console.log('Not found');
}
