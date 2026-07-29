/* (c) 2017 KAI OS TECHNOLOGIES (HONG KONG) LIMITED All rights reserved. This
 * file or any portion thereof may not be reproduced or used in any manner
 * whatsoever without the express written permission of KAI OS TECHNOLOGIES
 * (HONG KONG) LIMITED. KaiOS is the trademark of KAI OS TECHNOLOGIES (HONG KONG)
 * LIMITED or its affiliate company and may be registered in some jurisdictions.
 * All other trademarks are the property of their respective owners.
 */

import BaseModule from 'base-module';
/*
 * case 1: DUT in idle, observe dmApnSettings change => update 'ril.data.apnSettings.simX'
 * case 2: DUT in idle, observe dmApnProtocol change => update 'ril.data.apnSettings.simX'
 *
 * case 3: Reboot DUT and don't change simcards => update 'ril.data.apnSettings.simX'
 * case 4: Reboot DUT without insert simcard => do nothing
 * case 5: Reboot DUT with simcards change => update dmApnSettings => case 1
 * case 3 ~ 5 are normal reboot DUT.
 *
 * ril.data.dm.apnSettings.simX change => update ril.data.apnSettings.simX
 * dm.apnSettings.protocol change => update ril.data.apnSettings.sim1 & sim2
 */


class DMApnSettings extends BaseModule {

  dmApnProtocol;

  cloneApn(apn) {
    let newApn = {};
    for (let p in apn) {
      newApn[p] = apn[p];
    }
    return newApn;
  }

  combineApn(value, name) {
    const apnNameMap = [{
      type: 'default',
      key: 'apn',
      name: 'ril.data.apn.sim',
      find: false
    }, {
      type: 'supl',
      key: 'apn',
      name: 'ril.supl.apn.sim',
      find: false
    }, {
      type: 'supl',
      key: 'protocol',
      name: 'ril.supl.protocol.sim',
      find: false
    }, {
      type: 'supl',
      key: 'roaming_protocol',
      name: 'ril.supl.roaming_protocol.sim',
      find: false
    }, {
      type: 'Emergency',
      key: 'apn',
      name: 'ril.emergency.apn.sim',
      find: false
    }, {
      type: 'Emergency',
      key: 'protocol',
      name: 'ril.emergency.protocol.sim',
      find: false
    }, {
      type: 'Emergency',
      key: 'roaming_protocol',
      name: 'ril.emergency.roaming_protocol.sim',
      find: false
    }];
    const settingsArray = [];
    if (value) {
      let newApn = [];
      value.forEach((apn, index) => {
        newApn[index] = this.cloneApn(apn);
        if (this.dmApnProtocol) {
          newApn[index].protocol = this.dmApnProtocol;
          newApn[index].roaming_protocol = this.dmApnProtocol;
        }
        apnNameMap.forEach((item) => {
          if (apn.types && apn.types.includes(item.type)) {
            item.find = true;
            settingsArray.push({
              name: item.name + name.slice(-1),
              value: apn[item.key]
            });
          }
        });
      });
      apnNameMap.forEach((item) => {
        if (!item.find) {
          settingsArray.push({
            name: item.name + name.slice(-1),
            value: ''
          });
        }
      });
      const apnSettingsMap = {
        'ril.data.dm.apnSettings.sim1': 'ril.data.apnSettings.sim1',
        'ril.data.dm.apnSettings.sim2': 'ril.data.apnSettings.sim2'
      };
      window.DUMP('APN: combineApn');
      settingsArray.push({
        name: apnSettingsMap[name],
        value: newApn
      });
      SettingsObserver.setValue(settingsArray);
    }
  }

  getDMApnProtocol() {
    SettingsObserver.getValue('dm.apnSettings.protocol').then((value) => {
      this.dmApnProtocol = value;
    });
  }

  resetApnSettings(evt) {
    const simApnSettingsKey = [
      'ril.data.apnSettings.sim1',
      'ril.data.apnSettings.sim2'
    ];
    const key = simApnSettingsKey[evt.detail.cardIndex];
    SettingsObserver.getValue(key).then((apnSettings) => {
      window.DUMP('APN: resetApnSettings');
      SettingsObserver.setValue([{
        name: key,
        value: apnSettings
      }]);
    });
  }

  start() {
    this.getDMApnProtocol();
    SettingsObserver.observe('dm.apnSettings.protocol', '',
      this.ObserveDMProtocol.bind(this), true);
    SettingsObserver.observe('ril.data.dm.apnSettings.sim1', '',
      this.ObserveDMApnSettings.bind(this), true);
    SettingsObserver.observe('ril.data.dm.apnSettings.sim2', '',
      this.ObserveDMApnSettings.bind(this), true);
    window.addEventListener('reset-apn', this.resetApnSettings.bind(this));
  }

  ObserveDMProtocol(value) {
    const keys = [
      'ril.data.dm.apnSettings.sim1',
      'ril.data.dm.apnSettings.sim2'
    ];
    this.dmApnProtocol = value;
    for (let i = 0; i < navigator.b2g.mobileConnections.length; i++) {
      const key = keys[i];
      SettingsObserver.getValue(key).then((apnSettings) => {
        this.combineApn(apnSettings, key);
      });
    }
  }

  ObserveDMApnSettings(value, name) {
    this.combineApn(value, name);
  }
}

let instance = new DMApnSettings();
instance.start();

export default instance;
