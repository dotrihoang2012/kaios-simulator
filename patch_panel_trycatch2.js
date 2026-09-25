const fs = require('fs');
let js = fs.readFileSync('web-settings/settings/js/panels/wifi_auth/panel.js', 'utf8');

const regex = /function connectNetwork\(\) \{\n\s*if \(window\.parent && window\.parent\.showToast\) window\.parent\.showToast\('connectNetwork called, key: ' \+ WifiHelper\.getKeyManagement\(elements\.network\)\);\n\s*const \{ network \} = elements;[\s\S]*?WifiContext\.associateNetwork\(network, callback\);\n\s*break;\n\s*\}/m;

const newStr = "function connectNetwork() {\n" +
"        if (window.parent && window.parent.showToast) window.parent.showToast('connectNetwork called, key: ' + WifiHelper.getKeyManagement(elements.network));\n" +
"        const { network } = elements;\n" +
"        const key = WifiHelper.getKeyManagement(network);\n" +
"        const callback = result => {\n" +
"          if (result && result.message === 'network not found') {\n" +
"            backPrevious = true;\n" +
"            NavigationMap.navigateBack();\n" +
"            self.openBadCredentialsDialog('wifi-association-reject');\n" +
"          }\n" +
"        };\n" +
"        let simCardNum = null;\n" +
"        try {\n" +
"          switch (key) {\n" +
"            case 'WEP':\n" +
"            case 'WPA-PSK':\n" +
"            case 'WPA-EAP':\n" +
"            case 'WPA2-PSK':\n" +
"            case 'WPA/WPA2-PSK':\n" +
"            case 'SAE':\n" +
"              if (elements.securityType === 'WPA-EAP') {\n" +
"                simCardNum = WifiUtils.getSimNum(elements);\n" +
"              }\n" +
"\n" +
"              WifiHelper.setPassword({\n" +
"                network,\n" +
"                password: elements.password ? elements.password.value : '',\n" +
"                identity: elements.identity ? elements.identity.value : '',\n" +
"                eap: elements.eap ? elements.eap.value : '',\n" +
"                phase2: elements.authPhase2 ? elements.authPhase2.value : '',\n" +
"                certificate: elements.certificate ? elements.certificate.value : '',\n" +
"                keyIndex: elements.keyIndex ? elements.keyIndex.value - 1 : 0\n" +
"              });\n" +
"\n" +
"              network.sim_num = simCardNum;\n" +
"              if (window.parent && window.parent.showToast) window.parent.showToast('Calling associateNetwork');\n" +
"              WifiContext.associateNetwork(network, callback);\n" +
"              break;\n" +
"            default:\n" +
"              if (window.parent && window.parent.showToast) window.parent.showToast('Calling associateNetwork default');\n" +
"              WifiContext.associateNetwork(network, callback);\n" +
"              break;\n" +
"          }\n" +
"        } catch (e) {\n" +
"          if (window.parent && window.parent.showToast) window.parent.showToast('CRASH: ' + e.message);\n" +
"        }\n" +
"      }";

if (js.match(regex)) {
    js = js.replace(regex, newStr);
    fs.writeFileSync('web-settings/settings/js/panels/wifi_auth/panel.js', js);
    console.log('Success try-catch');
} else {
    console.log('Not found');
}
