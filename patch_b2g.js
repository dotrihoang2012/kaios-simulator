const fs = require('fs');
let js = fs.readFileSync('settings-host/b2g.js', 'utf8');
js = js.replace(/connection: \{ status: 'connected', network: \{ ssid: 'KaiOS-Sim', security: 'WPA2', signalStrength: 92 \} \},/g, "connection: { status: 'connected', network: { ssid: 'KaiOS-Sim', security: 'WPA2', signalStrength: 92, relSignalStrength: 92, connected: true, keyManagement: ['WPA-PSK'] } },");
fs.writeFileSync('settings-host/b2g.js', js);
