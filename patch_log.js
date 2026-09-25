const fs = require('fs');
let js = fs.readFileSync('web-settings/settings/js/panels/wifi_available_networks/wifi_network_list.js', 'utf8');

if (!js.includes('console.log("toggleNetwork called"')) {
  js = js.replace(/toggleNetwork\(network, bodyId\) \{/, "toggleNetwork(network, bodyId) {\n          console.log('toggleNetwork called', network.ssid);");
  fs.writeFileSync('web-settings/settings/js/panels/wifi_available_networks/wifi_network_list.js', js);
  console.log('Patched log');
}
