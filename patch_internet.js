const fs = require('fs');
let js = fs.readFileSync('settings-host/b2g.js', 'utf8');

const oldNet = "{ ssid: 'KaiOS-Sim', security: 'WPA2', signalStrength: 92, relSignalStrength: 92, connected: true, keyManagement: ['WPA-PSK'] }";
const newNet = "{ ssid: 'KaiOS-Sim', security: 'WPA2', signalStrength: 92, relSignalStrength: 92, connected: true, keyManagement: ['WPA-PSK'], hasInternet: true }";
js = js.replace(oldNet, newNet);

const oldConn = "connection: { status: 'connected', network: { ssid: 'KaiOS-Sim', security: 'WPA2', signalStrength: 92, relSignalStrength: 92, connected: true, keyManagement: ['WPA-PSK'] } }";
const newConn = "connection: { status: 'connected', network: { ssid: 'KaiOS-Sim', security: 'WPA2', signalStrength: 92, relSignalStrength: 92, connected: true, keyManagement: ['WPA-PSK'], hasInternet: true } }";
js = js.replace(oldConn, newConn);

const oldEvent = "wifi.connection.status = 'connected';\r\n          if (typeof wifi.onstatuschange === 'function') wifi.onstatuschange({ status: 'connected', network: wifi.connection.network });";
const newEvent = "wifi.connection.status = 'connected';\r\n          if (typeof wifi.onstatuschange === 'function') wifi.onstatuschange({ status: 'connected', network: wifi.connection.network });\r\n          if (typeof wifi.onwifihasinternet === 'function') wifi.onwifihasinternet({ network: wifi.connection.network });";

let matchIndex = js.indexOf(oldEvent);
if (matchIndex === -1) {
  const oldEventLf = oldEvent.replace(/\r\n/g, '\n');
  const newEventLf = newEvent.replace(/\r\n/g, '\n');
  js = js.replace(oldEventLf, newEventLf);
} else {
  js = js.replace(oldEvent, newEvent);
}

fs.writeFileSync('settings-host/b2g.js', js);
console.log('Success');
