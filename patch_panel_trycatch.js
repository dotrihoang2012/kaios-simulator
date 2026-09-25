const fs = require('fs');
let js = fs.readFileSync('web-settings/settings/js/panels/wifi_auth/panel.js', 'utf8');

const regex = /function connectNetwork\(\) \{\n\s*if \(window\.parent && window\.parent\.showToast\) window\.parent\.showToast\('connectNetwork called, key: ' \+ WifiHelper\.getKeyManagement\(elements\.network\)\);\n\s*const \{ network \} = elements;[\s\S]*?WifiContext\.associateNetwork\(network, callback\);\n\s*break;\n\s*\}/m;

const newStr = unction connectNetwork() {
        if (window.parent && window.parent.showToast) window.parent.showToast('connectNetwork called, key: ' + WifiHelper.getKeyManagement(elements.network));
        const { network } = elements;
        const key = WifiHelper.getKeyManagement(network);
        const callback = result => {
          if (result && result.message === 'network not found') {
            backPrevious = true;
            NavigationMap.navigateBack();
            self.openBadCredentialsDialog('wifi-association-reject');
          }
        };
        let simCardNum = null;
        try {
          switch (key) {
            case 'WEP':
            case 'WPA-PSK':
            case 'WPA-EAP':
            case 'WPA2-PSK':
            case 'WPA/WPA2-PSK':
            case 'SAE':
              if (elements.securityType === 'WPA-EAP') {
                simCardNum = WifiUtils.getSimNum(elements);
              }

              WifiHelper.setPassword({
                network,
                password: elements.password ? elements.password.value : '',
                identity: elements.identity ? elements.identity.value : '',
                eap: elements.eap ? elements.eap.value : '',
                phase2: elements.authPhase2 ? elements.authPhase2.value : '',
                certificate: elements.certificate ? elements.certificate.value : '',
                keyIndex: elements.keyIndex ? elements.keyIndex.value - 1 : 0
              });

              // eslint-disable-next-line
              network.sim_num = simCardNum;
              if (window.parent && window.parent.showToast) window.parent.showToast('Calling associateNetwork');
              WifiContext.associateNetwork(network, callback);
              break;
            default:
              if (window.parent && window.parent.showToast) window.parent.showToast('Calling associateNetwork default');
              WifiContext.associateNetwork(network, callback);
              break;
          }
        } catch (e) {
          if (window.parent && window.parent.showToast) window.parent.showToast('CRASH: ' + e.message);
        }
      };

if (js.match(regex)) {
    js = js.replace(regex, newStr);
    fs.writeFileSync('web-settings/settings/js/panels/wifi_auth/panel.js', js);
    console.log('Success try-catch');
} else {
    console.log('Not found');
}
