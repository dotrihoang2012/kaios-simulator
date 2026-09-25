const fs = require('fs');
let js = fs.readFileSync('settings-host/b2g.js', 'utf8');

const regex = /associate: function \(network\) \{[\s\S]*?return r;\n        \},/m;

const newAssoc = "associate: function (network) {\n" +
"          if (window.parent && window.parent.showToast) window.parent.showToast('associate start: ' + network.ssid);\n" +
"          var r = { result: true, error: null, onsuccess: null, onerror: null };\n" +
"          setTimeout(function() {\n" +
"            if (window.parent && window.parent.showToast) window.parent.showToast('step 1');\n" +
"            if (typeof r.onsuccess === 'function') r.onsuccess({ target: r });\n" +
"            wifi.connection.status = 'connecting';\n" +
"            wifi.connection.network = network;\n" +
"            if (typeof wifi.onstatuschange === 'function') wifi.onstatuschange({ status: 'connecting', network: network });\n" +
"            if (window.parent && typeof window.parent.setWifiStatus === 'function') window.parent.setWifiStatus('connecting', 0);\n" +
"            setTimeout(function() {\n" +
"              if (window.parent && window.parent.showToast) window.parent.showToast('step 2');\n" +
"              wifi.connection.status = 'associated';\n" +
"              if (typeof wifi.onstatuschange === 'function') wifi.onstatuschange({ status: 'associated', network: network });\n" +
"              setTimeout(function() {\n" +
"                if (window.parent && window.parent.showToast) window.parent.showToast('step 3');\n" +
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
    console.log('Success b2g toast');
} else {
    console.log('Not found');
}
