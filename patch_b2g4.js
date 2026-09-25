const fs = require('fs');
let js = fs.readFileSync('settings-host/b2g.js', 'utf8');

const targetStr =         if (on) {
          wifi.connection.status = 'connecting';
          if (typeof wifi.onstatuschange === 'function') wifi.onstatuschange({ status: 'connecting', network: wifi.connection.network });
          setTimeout(function() {
            wifi.connection.status = 'connected';
            if (typeof wifi.onstatuschange === 'function') wifi.onstatuschange({ status: 'connected', network: wifi.connection.network });
            if (typeof wifi.onwifihasinternet === 'function') wifi.onwifihasinternet({ network: wifi.connection.network });
            if (window.parent && typeof window.parent.showToast === 'function') {
              window.parent.showToast('Connected to KaiOS-sim');
            }
          }, 1500);
        } else {
          wifi.connection.status = 'disconnected';
          if (typeof wifi.onstatuschange === 'function') wifi.onstatuschange({ status: 'disconnected' });
        };

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

if (js.includes(targetStr)) {
    js = js.replace(targetStr, newBlock);
    fs.writeFileSync('settings-host/b2g.js', js);
    console.log('Success toggle block');
} else {
    console.log('Not found string block');
}
