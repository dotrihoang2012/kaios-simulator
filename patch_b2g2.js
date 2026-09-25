const fs = require('fs');
let js = fs.readFileSync('settings-host/b2g.js', 'utf8');

const regex = /associate: function \(\) \{ return req\(true\); \},/g;

const newAssoc = "associate: function (network) {\n" +
"          var r = { result: true, error: null, onsuccess: null, onerror: null };\n" +
"          setTimeout(function() {\n" +
"            if (typeof r.onsuccess === 'function') r.onsuccess({ target: r });\n" +
"            wifi.connection.status = 'connecting';\n" +
"            wifi.connection.network = network;\n" +
"            if (typeof wifi.onstatuschange === 'function') wifi.onstatuschange({ status: 'connecting', network: network });\n" +
"            if (window.parent && typeof window.parent.setWifiStatus === 'function') {\n" +
"               window.parent.setWifiStatus('connecting', 0);\n" +
"            }\n" +
"            setTimeout(function() {\n" +
"              wifi.connection.status = 'associated';\n" +
"              if (typeof wifi.onstatuschange === 'function') wifi.onstatuschange({ status: 'associated', network: network });\n" +
"              setTimeout(function() {\n" +
"                wifi.connection.status = 'connected';\n" +
"                network.connected = true;\n" +
"                network.hasInternet = true;\n" +
"                if (typeof wifi.onstatuschange === 'function') wifi.onstatuschange({ status: 'connected', network: network });\n" +
"                if (typeof wifi.onwifihasinternet === 'function') wifi.onwifihasinternet({ network: network });\n" +
"                if (window.parent && typeof window.parent.setWifiStatus === 'function') {\n" +
"                   var level = Math.min(Math.floor((network.relSignalStrength || 100) / 20), 4);\n" +
"                   if (level === 0) level = 1;\n" +
"                   window.parent.setWifiStatus('connected', level);\n" +
"                }\n" +
"              }, 1000);\n" +
"            }, 2000);\n" +
"          }, 10);\n" +
"          return r;\n" +
"        },";

if (js.match(regex)) {
    js = js.replace(regex, newAssoc);
    fs.writeFileSync('settings-host/b2g.js', js);
    console.log('Success b2g');
} else {
    console.log('Not found');
}
