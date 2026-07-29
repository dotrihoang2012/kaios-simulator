import DeviceInfoComposer from './device_info_composer';
import * as utils from './utils';

// https://eventlogger.kaiostech.com/config/?os=kaios&os_ver=2.5&curef=abcdef&mnc=0&mcc=0&network_mnc=0&network=mcc=0
const CONFIG_URL = 'https://eventlogger.kaiostech.com/config';
const CONFIG_NAME = 'eventlogger_config';
const CONFIG_SETTING = 'evl.config.url';
const CONFIG_QUOTA = 'config_quota';

const MILLISECONDS_DAY = 24 * 60 * 60 * 1000;

class EVLConfig {
  constructor() {
    this.DEFAULT_CONFIG = {
      'events': {
        'app_position': {
          'priority': 3,
          'consent_needed': 'N'
        },
        'app_open': {
          'priority': 3,
          'consent_needed': 'N',
          'applist': {
            'whatsapp': {
              'priority': 1,
              'consent_needed': 'N',
            },
            'internet': {
              'priority': 1,
              'consent_needed': 'N',
            }
          }
        },
        'app_close': {
          'priority': 3,
          'consent_needed': 'N'
        },
        'app_install': {
          'priority': 3,
          'consent_needed': 'N'
        },
        'app_uninstall': {
          'priority': 3,
          'consent_needed': 'N'
        },
        'app_update': {
          'priority': 3,
          'consent_needed': 'N'
        },
        'app_pause': {
          'priority': 3,
          'consent_needed': 'N'
        },
        'call_start': {
          'priority': 3,
          'consent_needed': 'Y'
        },
        'call_start_in': {
          'priority': 3,
          'consent_needed': 'Y'
        },
        'call_end': {
          'priority': 3,
          'consent_needed': 'Y'
        },
        'call_reject': {
          'priority': 3,
          'consent_needed': 'Y'
        },
        'wifi_on': {
          'priority': 1,
          'consent_needed': 'N'
        },
        'wifi_off': {
          'proirity': 3,
          'consent_needed': 'N'
        },
        'wifi_connect': {
          'priority': 3,
          'consent_needed': 'N'
        },
        'sms_send': {
          'priority': 3,
          'consent_needed': 'Y'
        },
        'sms_receive': {
          'priority': 3,
          'consent_needed': 'Y'
        },
        'sms_open': {
          'priority': 3,
          'consent_needed': 'Y'
        },
        'contact_add': {
          'priority': 3,
          'consent_needed': 'N'
        },
        'app_summary': {
          'priority': 1,
          'consent_needed': 'N'
        },
        'data_summary': {
          'priority': 1,
          'consent_needed': 'N'
        },
        'buffer_summary': {
          'priority': 1,
          'consent_needed': 'N'
        },
        'telemetry_consent': {
          'priority': 1,
          'consent_needed': 'N'
        },
        'targeting_consent': {
          'priority': 1,
          'consent_needed': 'N'
        },
        'age_consent': {
          'priority': 1,
          'consent_needed': 'N'
        },
        'apps_preloaded': {
          'priority': 1,
          'consent_needed': 'N'
        },
        'call_missed': {
          'priority': 3,
          'consent_needed': 'Y'
        },
      },
      'chunk_size': 30, // Read chunk by chunk from db to send data.
      'buffer_size': 200,
      'config_id': null
    };

    this.REPORT_TIMEOUT = 30000;

    SettingsObserver.observe(CONFIG_SETTING,
      CONFIG_URL,
      url => { this.baseUrl = url });
  }

  static async create() {
    let evlConfig = new EVLConfig();
    let config = await evlConfig.getConfig();
    evlConfig.updateConfig(config);

    return evlConfig;
  }

  getOnlineConfig() {
    if (!window.isOnline()) {
      utils.debug('getOnlineConfig offline, return');

      return;
    }

    var time = parseInt(this.config.last_check);
    if (!isNaN(time) &&
      (Date.now() - time) < MILLISECONDS_DAY) {
      utils.debug('getOnlineConfig too soon, return');

      return;
    }

    Promise.all([DeviceInfoComposer.getDeviceInfo(),
    DeviceInfoComposer.getStandardPackage()]).then(result => {
      var params = {
        os: result[0]['deviceinfo.software'] || 'kaios',
        os_ver: result[0]['deviceinfo.os'] || 2.5,
        curef: result[0]['deviceinfo.cu'],
        uuid: result[0]['app.update.custom'],
        mcc: result[1]['icc_mcc'] || 0,
        mnc: result[1]['icc_mnc'] || 0,
        network_mcc: result[1]['network_mcc'] || 0,
        network_mnc: result[1]['network_mnc'] || 0,
        config_id: this.config.config_id
      };

      // os=kaios&os_ver=2.5&curef=abcdef&mnc=0&mcc=0&network_mnc=0&network_mcc=0&config_id=null
      var commsParams = Object.keys(params).map(function (key) {
        return key + '=' + params[key];
      }).join('&');

      var url = this.baseUrl + '?' + commsParams;
      url = encodeURI(url);
      var requester = new Requester(this.REPORT_TIMEOUT);

      return requester.send({
        url: url,
        method: 'GET',
      });
    }).then(result => {
      utils.debug(result);
      this.persistConfig(result);
    }).catch(error => {
      this.updateCheckponit();
      utils.debug(error);
    });
  }

  updateCheckponit() {
    try {
      var last_check = Date.now();
      this.config.last_check = last_check;
      utils.setItem(CONFIG_NAME, this.config);
    } catch (e) {
      utils.debug('not a valid JSON format');
    }
  }

  getConfigfromPersist() {
    return new Promise((resolve) => {
      utils.getItem(CONFIG_NAME).then(data => {
        if (data) {
          resolve(data);
        } else {
          resolve(this.DEFAULT_CONFIG);
        }
      });
    });
  }

  persistConfig(data) {
    var obj = {};
    if (typeof data === 'object') {
      obj = data;
    } else {
      try {
        obj = JSON.parse(data);
      } catch (e) {
        utils.debug('not a valid JSON format');
      }
    }
    if (!this.validate(obj)) {
      utils.debug('Invalid format from config server');
      return;
    }
    try {
      var last_check = Date.now();
      obj.last_check = last_check;
      this.makeSureEventTypes(obj);
      utils.setItem(CONFIG_NAME, obj);
      // Update config
      this.updateConfig(obj);
      // Update quota for DB
      var evt = new CustomEvent(CONFIG_QUOTA, { detail: { buffer_size: obj.buffer_size } });
      window.dispatchEvent(evt);
    } catch (e) {
      utils.debug('not a valid JSON format');
    }
  }

  makeSureEventTypes(obj) {
    var types = ['app_summary', 'data_summary', 'buffer_summary'];
    types.forEach(type => {
      if (!obj.events[type]) {
        if (this.DEFAULT_CONFIG.events[type]) {
          obj.events[type] = this.DEFAULT_CONFIG.events[type];
        }
      }
    })
  }

  validate(config) {
    var ret = false;
    if (config &&
      config.events &&
      config.buffer_size &&
      config.config_id) {
      var inter = parseInt(config.buffer_size);
      if (!isNaN(inter)) {
        config.buffer_size = inter;
        ret = true;
      }
    }

    return ret;
  }

  getConfig() {
    if (this.config) {
      return Promise.resolve(this.config);
    }

    return this.getConfigfromPersist();
  }

  updateConfig(config) {
    this.config = config;
  }

  getPriority(record) {
    // Set low priority on default;
    let p = 3;

    const type = record.event_type;
    if (!type) {
      return p;
    }
    utils.debug('getPriority event_type' + type);

    const config = this.config.events[type];
    if (!config) {
      return p;
    }

    if (config.priority) {
      p = config.priority;
    }

    const app_id = record.data && record.data.app_id;
    if (!app_id) {
      return p;
    }

    const prop = this.getAppConfigProperty(type, app_id, 'priority');
    if (prop) {
      p = prop;
    }

    return p;
  }

  getAppConfigProperty(type, app_id, prop) {
    let p = null;

    const app = applications && applications.getByManifestURL(app_id);
    const appName = app && app.name.replace(/ +/g, "").toLowerCase();
    if (!appName) {
      return p;
    }
    
    const config = this.config.events[type];
    if (!config || !config.applist) {
      return p;
    }

    const key_id = Object.keys(config.applist)
                    .find(key => key.toLowerCase().indexOf(appName) > -1);
    if (!key_id) {
      return p;
    }

    if (config.applist[key_id][prop]) {
      p = config.applist[key_id][prop];
      utils.debug('getPriority appName' + appName);
      utils.debug('getPriority prop' + prop);
      utils.debug('getPriority value' + p);
    }

    return p;
  }

  consentNeeded(record) {
    var ret = true;
    const type = record.event_type;
    if (!type) {
      return ret;
    }

    const config = this.config.events[type];
    if (!config) {
      return ret;
    }

    if (config.consent_needed.toUpperCase() == 'N') {
      ret = false;
    }

    const app_id = record.data && record.data.app_id;
    if (!app_id) {
      return ret;
    }

    const value = this.getAppConfigProperty(type, app_id, 'consent_needed');
    if (value && value.toUpperCase() == 'N') {
      ret = false;
    }

    return ret;
  }

}


export default EVLConfig;
