const fs = require('fs');
let js = fs.readFileSync('settings-host/b2g.js', 'utf8');

const regex = /associate: function \(\) \{ return req\(true\); \},/g;

const newAssoc = ssociate: function (network) { 
          var r = { result: true, error: null, onsuccess: null, onerror: null };
          setTimeout(function() {
            if (typeof r.onsuccess === 'function') r.onsuccess({ target: r });
            wifi.connection.status = 'connecting';
            wifi.connection.network = network;
            if (typeof wifi.onstatuschange === 'function') wifi.onstatuschange({ status: 'connecting', network: network });
            if (window.parent && typeof window.parent.setWifiStatus === 'function') {
               window.parent.setWifiStatus('connecting', 0);
            }
            setTimeout(function() {
              wifi.connection.status = 'associated';
              if (typeof wifi.onstatuschange === 'function') wifi.onstatuschange({ status: 'associated', network: network });
              setTimeout(function() {
                wifi.connection.status = 'connected';
                network.connected = true;
                network.hasInternet = true;
                if (typeof wifi.onstatuschange === 'function') wifi.onstatuschange({ status: 'connected', network: network });
                if (typeof wifi.onwifihasinternet === 'function') wifi.onwifihasinternet({ network: network });
                if (window.parent && typeof window.parent.setWifiStatus === 'function') {
                   var level = Math.min(Math.floor((network.relSignalStrength || 100) / 20), 4);
                   if (level === 0) level = 1; // minimum 1 bar if connected
                   window.parent.setWifiStatus('connected', level);
                }
              }, 1000);
            }, 2000);
          }, 10);
          return r; 
        },;

if (js.match(regex)) {
    js = js.replace(regex, newAssoc);
    fs.writeFileSync('settings-host/b2g.js', js);
    console.log('Success b2g');
} else {
    console.log('Not found');
}
