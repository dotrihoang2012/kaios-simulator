/* (c) 2017 KAI OS TECHNOLOGIES (HONG KONG) LIMITED All rights reserved. This
 * file or any portion thereof may not be reproduced or used in any manner
 * whatsoever without the express written permission of KAI OS TECHNOLOGIES
 * (HONG KONG) LIMITED. KaiOS is the trademark of KAI OS TECHNOLOGIES (HONG KONG)
 * LIMITED or its affiliate company and may be registered in some jurisdictions.
 * All other trademarks are the property of their respective owners.
 */

import BaseModule from 'base-module';

class TimeZoneSelect extends BaseModule {
  DEFAULT_COUNTRY = 'US';
  TZ_DEFAULT = 'Europe/London';
  TIMEZONE_FILE = '/resources/tz.json';
  MCC_FILE = '/resources/mcc.json';
  name = 'TimeZone';
  timezone = '';
  dst = 0;
  mcc = '';
  mnc = '';

  loadJSON(href) {
    return new Promise((resolve, reject) => {
      let xhr = new XMLHttpRequest();
      xhr.open('GET', href, true);
      xhr.responseType = 'json';
      xhr.onload = () => {
        resolve(xhr.response);
      };
      xhr.onerror = () => {
        console.error('Error getting file');
        reject(xhr.response);
      };
      xhr.send();
    });
  }

  getCountryCode() {
    return new Promise(resolve => {
      const MCC_FILE =
        window.AppOrigin.getOrigin('shared') + this.MCC_FILE;
      this.loadJSON(MCC_FILE).then(response => {
        let cc = this.DEFAULT_COUNTRY;
        if (response && response[this.mcc]) {
          cc = response[this.mcc].code.toUpperCase();
        }
        this.debug('contrycode ' + cc);
        resolve(cc);
      });
    });
  }

  saveTimezoneCity(city) {
    this.debug('saveTimezoneCity ' + city);
    SettingsObserver.setValue([{
      name :'time.timezone',
      value: city
    }]);
  }

  convertToCityName() {
    this.getCountryCode().then(currentCountryCode => {
      const TZ_FILE =
        window.AppOrigin.getOrigin('shared') + this.TIMEZONE_FILE;
      this.loadJSON(TZ_FILE).then(response => {
        const tzList = response;
        const defaultOffset = this.timezone.substring(3, this.timezone.length);
        for (let i = 0; i < tzList.length; i++) {
          const offsets = tzList[i].offset.split(',');
          if (currentCountryCode === tzList[i].cc &&
            offsets[this.dst === 0 ? 0 : 1] === defaultOffset) {
            this.saveTimezoneCity(tzList[i].city);
            break;
          }
        }
      });
    });
  }

  updateTimezone() {
    if (!this.timezone.startsWith('UTC')) {
      return;
    }
    const conns = navigator.b2g.mobileConnections;
    Array.from(conns).some((conn) => {
      if (conn) {
        if (conn.voice && conn.voice.network && conn.voice.connected) {
          this.mcc = conn.voice.network.mcc;
          this.mnc = conn.voice.network.mnc;
        } else if (conn.data && conn.data.network && conn.data.connected) {
          this.mcc = conn.data.network.mcc;
          this.mnc = conn.data.network.mnc;
        }
      }
      if (this.mcc) {
        return true;
      }
    });

    if (this.mcc) {
      this.debug('network plmn ' + this.mcc + ' ' + this.mnc);
      this.convertToCityName();
    } else {
      SettingsObserver.getBatch(['operatorvariant.mcc', 'operatorvariant.mnc'])
        .then((result) => {
        result.forEach(setting => {
          if (setting.name === 'operatorvariant.mcc') {
            this.mcc = setting.value[0];
          } else if (setting.name === 'operatorvariant.mnc') {
            this.mnc = setting.value[0];
          }
        });
       this.debug('simcard plmn ' + this.mcc + ' ' + this.mnc);
        if (this.mcc) {
          this.convertToCityName();
        }
      });
    }
  }

  start() {
    const TIMEZONE_DST_KEY = 'time.timezone.dst';
    SettingsObserver.observe('time.timezone', this.TZ_DEFAULT, value => {
      this.timezone = value;
      this.debug('time.timezone: ' + value);
      this.updateTimezone();
    });
    SettingsObserver.observe('time.timezone.dst', 0, value => {
      this.dst = value;
      this.debug('dst ' + value);
    });
  }
}

var instance = new TimeZoneSelect();
instance.start();

export default instance;

