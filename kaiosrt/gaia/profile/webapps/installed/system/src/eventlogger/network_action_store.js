import ActionStore from './action_store';
import * as utils from './utils';

const KEY = 'EVL_WIFISSID';

class NetworkActionStore extends ActionStore {
  constructor() {
    super('evl_network');
    this.isCallStartManuTimer = 0;
    this.isCallStartManuWait = 1000;
    this.init();
  }

  init() {
    utils.getItem(KEY).then(info => {
        if (!info) {
            info = {};
        }
        this.wifiInfo = info;
    })
  }

  markAction(type, action) {
    var obj = {};
    switch (type) {
      case 'wifi_on':
        this.save(type, obj);
        break;
      case 'wifi_off':
        this.save(type, obj);
        break;
      case 'wifi_connect':
        if (action) {
          var is_public = action.password === null ||
            action.security.length === 0;
          obj.network_uid = action.ssid;
          obj.is_public = is_public;
          obj.wifi_count = this.setWifiSsidConnected(obj.network_uid);
          this.save(type, obj);
        }
        break;
      case 'call_start':
        if (action) {
          obj.is_contact = action.is_contact;
          obj.call_method = action.call_method;
          this.save(type, obj);
        }
        break;
      case 'call_start_in':
        if (action) {
          obj.is_contact = action.is_contact;
          this.save(type, obj);
        }
        break;
      case 'call_end':
        if (action) {
          obj.is_contact = action.is_contact;
          // TODO
          obj.call_duration = action.call_duration;
          this.save(type, obj);
        }
        break;
      case 'call_reject':
      case 'call_missed':
        if (action) {
          obj.is_contact = action.is_contact;
          obj.caller_number = action.caller_number;
          this.save(type, obj);
        }
        break;
      default:
        break;
    }
  }

  setWifiSsidConnected(ssid) {
    var ret = 1;
    if (this.wifiInfo && this.wifiInfo[ssid]) {
      this.wifiInfo[ssid] += 1;
    } else {
      this.wifiInfo[ssid] = 1;
    }
    ret = this.wifiInfo[ssid];
    utils.setItem(KEY, this.wifiInfo);

    return ret;
  }

  reset() {
    utils.setItem(KEY, null);
    delete this.wifiInfo;
    this.wifiInfo = {};
  }

}

export default NetworkActionStore;
