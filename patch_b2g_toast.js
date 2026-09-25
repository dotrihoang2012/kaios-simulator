const fs = require('fs');
let js = fs.readFileSync('settings-host/b2g.js', 'utf8');

const regex = /associate: function \(network\) \{[\s\S]*?return r;\n        \},/m;

const newAssoc = ssociate: function (network) {
          if (window.parent && window.parent.showToast) window.parent.showToast('associate start: ' + network.ssid);
          var r = { result: true, error: null, onsuccess: null, onerror: null };
          setTimeout(function() {
            if (window.parent && window.parent.showToast) window.parent.showToast('step 1');
            if (typeof r.onsuccess === 'function') r.onsuccess({ target: r });
            wifi.connection.status = 'connecting';
            wifi.connection.network = network;
            if (typeof wifi.onstatuschange === 'function') wifi.onstatuschange({ status: 'connecting', network: network });
            if (window.parent && typeof window.parent.setWifiStatus === 'function') window.parent.setWifiStatus('connecting', 0);
            
            setTimeout(function() {
              if (window.parent && window.parent.showToast) window.parent.showToast('step 2');
              wifi.connection.status = 'associated';
              if (typeof wifi.onstatuschange === 'function') wifi.onstatuschange({ status: 'associated', network: network });
              
              setTimeout(function() {
                if (window.parent && window.parent.showToast) window.parent.showToast('step 3');
                wifi.connection.status = 'connected';
                network.connected = true;
                network.hasInternet = true;
                if (typeof wifi.onstatuschange === 'function') wifi.onstatuschange({ status: 'connected', network: network });
                if (typeof wifi.onwifihasinternet === 'function') wifi.onwifihasinternet({ network: network });
                if (window.parent && typeof window.parent.setWifiStatus === 'function') {
                   var level = Math.min(Math.floor((network.relSignalStrength || 100) / 20), 4);
                   if (level === 0) level = 1;
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
    console.log('Success b2g toast');
} else {
    console.log('Not found');
}
