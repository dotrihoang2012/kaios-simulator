const fs = require('fs');
let js = fs.readFileSync('settings-host/b2g.js', 'utf8');

const regex = /if \(on\) \{\n\s*wifi\.connection\.status = 'connecting';\n\s*if \(typeof wifi\.onstatuschange === 'function'\) wifi\.onstatuschange\(\{ status: 'connecting', network: wifi\.connection\.network \}\);\n\s*setTimeout\(function\(\) \{\n\s*wifi\.connection\.status = 'connected';\n\s*if \(typeof wifi\.onstatuschange === 'function'\) wifi\.onstatuschange\(\{ status: 'connected', network: wifi\.connection\.network \}\);\n\s*if \(typeof wifi\.onwifihasinternet === 'function'\) wifi\.onwifihasinternet\(\{ network: wifi\.connection\.network \}\);\n\s*if \(window\.parent && typeof window\.parent\.showToast === 'function'\) \{\n\s*window\.parent\.showToast\('Connected to KaiOS-sim'\);\n\s*\}\n\s*\}, 1500\);\n\s*\} else \{\n\s*wifi\.connection\.status = 'disconnected';\n\s*if \(typeof wifi\.onstatuschange === 'function'\) wifi\.onstatuschange\(\{ status: 'disconnected' \}\);\n\s*\}/m;

const newBlock = "if (on) {\n" +
"          wifi.connection.status = 'connecting';\n" +
"          if (typeof wifi.onstatuschange === 'function') wifi.onstatuschange({ status: 'connecting', network: wifi.connection.network });\n" +
"          if (window.parent && typeof window.parent.setWifiStatus === 'function') window.parent.setWifiStatus('connecting', 0);\n" +
"          setTimeout(function() {\n" +
"            wifi.connection.status = 'connected';\n" +
"            if (typeof wifi.onstatuschange === 'function') wifi.onstatuschange({ status: 'connected', network: wifi.connection.network });\n" +
"            if (typeof wifi.onwifihasinternet === 'function') wifi.onwifihasinternet({ network: wifi.connection.network });\n" +
"            if (window.parent && typeof window.parent.setWifiStatus === 'function') {\n" +
"               var level = Math.min(Math.floor((wifi.connection.network.relSignalStrength || 100) / 20), 4);\n" +
"               if (level === 0) level = 1;\n" +
"               window.parent.setWifiStatus('connected', level);\n" +
"            }\n" +
"            if (window.parent && typeof window.parent.showToast === 'function') {\n" +
"              window.parent.showToast('Connected to KaiOS-sim');\n" +
"            }\n" +
"          }, 1500);\n" +
"        } else {\n" +
"          wifi.connection.status = 'disconnected';\n" +
"          if (typeof wifi.onstatuschange === 'function') wifi.onstatuschange({ status: 'disconnected' });\n" +
"          if (window.parent && typeof window.parent.setWifiStatus === 'function') window.parent.setWifiStatus('disconnected', 0);\n" +
"        }";

if (js.match(regex)) {
    js = js.replace(regex, newBlock);
    fs.writeFileSync('settings-host/b2g.js', js);
    console.log('Success toggle');
} else {
    console.log('Not found');
}
