import NetworkActionStore from './network_action_store';
import SummaryStore from './summary_store';
import DeviceInfoComposer from './device_info_composer';
import { patchInstalledApps } from './patch_app_object';
import * as utils from './utils';

const ONE_MONTH_IN_MS = 60 * 60 * 24 * 30 * 1000;
const SYSTEMURL = window.AppOrigin.getManifestURL('system');
const SEARCHURL = window.AppOrigin.getManifestURL('search');

class NetWorkTrafficCollector {
  constructor() {
    this.name = 'netWorkTrafficCollector';

    this.networkActionStore = new NetworkActionStore();
    var category = 'data_summary';
    var defaultData = {
      daily_wifi_in: 0,
      daily_wifi_out: 0,
      daily_bytes_in: 0,
      daily_bytes_out: 0,
      wifi_duration: 0,
      call_seconds_in: 0,
      call_seconds_out: 0,
      message_in: 0,
      message_out: 0
    };
    this.networkSummaryStore = new SummaryStore(category, defaultData);
  }

  start() {
    this.startWifi();
    this.startMessage();
    this.startCall();
  }

  stop() {
    if (this.wifiManager) {
      this.wifiManager.removeEventListener('enabled', this.bindWifiEanbeld);
      this.wifiManager.removeEventListener('wifihasinternet', this.bindWifihasinternet);
      this.wifiManager.removeEventListener('disabled', this.bindWifiDisabled);
    }
    if (this._telephony) {
      this._telephony.removeEventListener('callschanged', this.bindCallsChange);
    }
    this.bindCallEnded = null;
    this.mobileMsg.removeEventListener('sent', this.bindMessageHandler);
    this.mobileMsg.removeEventListener('received', this.bindMessageHandler);
    window.removeEventListener('serviceworkermessage', this.bindCallEnded);
  }

  startWifi() {
    // Wifi Duration in Second
    this.wifiEnabled = false;
    this.wifiConnectedStartTime = 0;
    this.wifiManager = navigator.b2g.wifiManager;
    this.bindWifiEanbeld = this.wifiEanbeld.bind(this);
    this.bindWifihasinternet = this.wifihasinternet.bind(this);
    this.bindWifiDisabled = this.wifiDisabled.bind(this);

    if (this.wifiManager && this.wifiManager.connection.network &&
      this.wifiManager.connection.network.hasInternet) {
      this.wifiConnected = true;
      this.updateWifiInvocation();
    }
    if (this.wifiManager) {
      this.wifiManager.addEventListener('enabled', this.bindWifiEanbeld);
      this.wifiManager.addEventListener('wifihasinternet', this.bindWifihasinternet);
      this.wifiManager.addEventListener('disabled', this.bindWifiDisabled);
    }
  }

  wifiEanbeld(e) {
    this.networkActionStore.markAction('wifi_on');
    this.wifiEnabled = true;
    utils.debug('wifi enabled', navigator.b2g.wifiManager.connection.status);
  }

  wifihasinternet(e) {
    if (e.hasInternet) {
      this.wifiConnected = true;
      this.updateWifiInvocation();
      var networkInfo = this.wifiManager.connection.network;
      this.networkActionStore.markAction('wifi_connect', networkInfo);
    } else {
      utils.debug('wifihasinternet false');
      this.wifiConnected = false;
      this.updateWifiInvocation();
    }
  }

  wifiDisabled(e) {
    utils.debug('wifi  disable', navigator.b2g.wifiManager.connection.status);
    this.networkActionStore.markAction('wifi_off');
    this.wifiConnected = false;
    this.wifiEnabled = false;

    this.updateWifiInvocation();
  }

  updateWifiInvocation(skipSave) {
    if (this.wifiConnected) {
      this.wifiConnectedStartTime = Date.now();
    } else {
      // Wifi enabled but no connection, the connected time is 0 when
      // Wifi is disabled.
      var elapsed = this.wifiConnectedStartTime === 0 ?
        0 : (Date.now() - this.wifiConnectedStartTime);
      this.wifiConnectedStartTime = 0;
      if (elapsed !== 0) {
        this.accumulateSummary('wifi_duration', elapsed / 1000, skipSave);
      }
      utils.debug('updateWifiInvocation', elapsed);
    }
  }

  calcWifiInvocation() {
    if (this.wifiConnected) {
      // Calculate till now
      this.wifiConnected = false;
      this.updateWifiInvocation(true);
      // Continue
      this.wifiConnected = true;
      this.updateWifiInvocation();
    }
  }

  accumulateSummary(type, action, skip) {
    switch (type) {
      case 'wifi_duration':
      case 'call_seconds_out':
      case 'call_seconds_in':
        if (action && !isNaN(parseInt(action))) {
          this.networkSummaryStore.data[type] += parseInt(action);
        }
        break;
      case 'message_in':
        this.networkSummaryStore.data[type] += 1;
        break;
      case 'message_out':
        this.networkSummaryStore.data[type] += 1;
        break;
    }
    utils.debug('NetworkTrafficSummary save storage', type, action);
    if (!skip) {
      this.networkSummaryStore.save();
    }
  }

  packSummary(from) {
    return Promise.all([DeviceInfoComposer.getStandardPackage(),
    this.getDataConsumption(from)]).then(results => {
      var standardPackage = results[0];
      standardPackage['event_type'] = 'data_summary';
      Object.keys(results[1]).forEach(key => {
        this.networkSummaryStore.data[key] = results[1][key];
      });
      // When WiFi is connected, cut off counting duration here.
      // Then keep counting after the summary packed.
      this.calcWifiInvocation();
      var data = JSON.parse(JSON.stringify(this.networkSummaryStore.data));
      standardPackage['data'] = data;
      this.reset();

      return Promise.resolve(standardPackage);
    }).catch(e => {
      return Promise.reject();
    });
  }

  reset() {
    // Ready to collect new summary
    this.networkSummaryStore.reset();
    // Reset ActionStore
    this.networkActionStore.reset();
  }

  getDataConsumption(from) {
    var ret = {
      daily_wifi_in: 0, daily_wifi_out: 0,
      daily_bytes_in: 0, daily_bytes_out: 0
    };

    var now = new Date();
    if (from.getTime() > now.getTime()) {
      return Promise.resolve(ret);
    }

    // Collect data usage in a month is fairly enough time span
    // considering the performance of getSample API
    if (now.getTime() - from.getTime() > ONE_MONTH_IN_MS) {
      from = new Date(now.getTime() - ONE_MONTH_IN_MS);
    }

    return this.getNetworks().then(networks => {
      return Promise.all([this.getAllSamples(networks, from, now),
        this.getAppsSamples(networks, from, now)]).then(results => {
        var data = {};
        Object.keys(results[0]).forEach(key => {
          data[key] = results[0][key];
        });
        // {apps_consumption: []}
        Object.keys(results[1]).forEach(key => {
          data[key] = results[1][key];
        });
        return Promise.resolve(data);
      }).catch((e) => {
        utils.debug(e);
        return Promise.resolve(ret);
      })
    }).catch((e) => {
      utils.debug(e);
      return Promise.resolve(ret);
    });
  }

  getNetworks() {
    if (!navigator.b2g.networkStats) {
      return Promise.reject('NotSupported');
    }

    return new Promise((resolve, reject) => {
      var networks = navigator.b2g.networkStats.getAvailableNetworks();
      networks.onsuccess = function () {
        resolve(this.result);
      };

      networks.onerror = function () {
        reject(networks.error);
        utils.debug('Something went wrong: ', networks.error);
      };
    });
  }

  getSamples(network, start, end, options) {
    var ret = { rxBytes: 0, txBytes: 0 };
    if (!navigator.b2g.networkStats || !network) {
      return Promise.resolve(ret);
    }

    return new Promise((resolve, reject) => {
      // Returns a mozNetworkStats object.
      var samples = navigator.b2g.networkStats.getSamples(network, start, end, options);

      samples.onsuccess = function () {
        const data = samples.result.getData();
        ret.rxBytes = data[0].rxBytes;
        ret.txBytes = data[0].txBytes;
        resolve(ret);
      };

      samples.onerror = function () {
        utils.debug('Something went wrong: ', samples.error);
        resolve(ret);
      };
    });
  }

  getAllSamples(networks, from, now) {
    var ret = {
      daily_wifi_in: 0, daily_wifi_out: 0,
      daily_bytes_in: 0, daily_bytes_out: 0
    };
    var p = [];
    networks.forEach(network => {
      p.push(this.getSamples(network, from, now));
    });
    // 0 for wifi, 1 and 2 for mobile if existed.
    return Promise.all(p).then(results => {
      ret.daily_wifi_in = results[0].rxBytes;
      ret.daily_wifi_out = results[0].txBytes;

      if (results[1]) {
        ret.daily_bytes_in += results[1].rxBytes;
        ret.daily_bytes_out += results[1].txBytes;
      }
      if (results[2]) {
        ret.daily_bytes_in += results[2].rxBytes;
        ret.daily_bytes_out += results[2].txBytes;
      }

      return Promise.resolve(ret);
    }).catch(() => {
      utils.debug('error getAllSamples');
      return Promise.resolve(ret);
    });
  }

  getRequestsFromCache() {
    var requests = [];
    if (applications && applications.installedApps) {
      const apps = patchInstalledApps(applications.installedApps);
      requests = this.fromApps(Object.values(apps));
    }
    return requests;
  }

  fromApps(apps) {
    var requests = [];
    apps.forEach(app => {
      // For the first run, installState could be "null"
      // - Installed
      // - Installing
      // - Pending
      if (app.installState === 0) {
        var obj = {app: {}, options: {}};
        var manifest = app.manifest || app.updateManifest;
        obj.app.manifestUrl = app.manifestUrl;
        obj.app.name = manifest.name;
        obj.app.version = manifest.version;
        try {
          const url = new URL(app.manifestUrl);
          obj.options.appOrigin = url.origin;

          requests.push(obj);
        } catch (e) {
          console.error("get app error");
        }
      } else {
        utils.debug(`Other state of the app ${app.installState} `);
      }
    });

    return requests;
  }

  genRequests() {
    var reqs = this.getRequestsFromCache();
    if (reqs.length > 0) {
      return Promise.resolve(reqs);
    } else {
      return this.getRequestsFromRegister();
    }
  }

  getRequestsFromRegister() {
    return new Promise((resolve, reject) => {
      AppsManager.getAll().then(apps => {
        var requests = [];
        requests = this.fromApps(apps);
        resolve(requests);
      }, reject)
    });
  }

  getAppsSamples(networks, from, now) {
    return this.genRequests().then(reqs => {
      var p = [];
      reqs.forEach(req => {
        p.push(this.getAppSamples(networks, from, now, req));
      })
      return Promise.all(p).then(results => {
        var data = {apps_consumption: []};
        results.forEach(result => {
          data.apps_consumption.push(result);
        })
        return Promise.resolve(data);
      })
    }, e => {
      utils.debug("Error getting appsSamples genRequests" + e);
      return Promise.resolve({apps_consumption: []});
    }).catch((e) => {
      utils.debug("Error getting appsSamples" + e);
      return Promise.resolve({apps_consumption: []});
    })
  }

  getAppSamples (networks, from, now, req) {
    var ret = {
      app_id: req.app.manifestUrl,
      app_name: req.app.name,
      app_version: req.app.version,
      daily_wifi_in: 0, daily_wifi_out: 0,
      daily_bytes_in: 0, daily_bytes_out: 0
    };

    var p = [];
    networks.forEach(network => {
      p.push(this.getSamples(network, from, now, req.options));
    });
    // 0 for wifi, 1 and 2 for mobile if existed.
    return Promise.all(p).then(results => {
      ret.daily_wifi_in = results[0].rxBytes;
      ret.daily_wifi_out = results[0].txBytes;

      if (results[1]) {
        ret.daily_bytes_in += results[1].rxBytes;
        ret.daily_bytes_out += results[1].txBytes;
      }
      if (results[2]) {
        ret.daily_bytes_in += results[2].rxBytes;
        ret.daily_bytes_out += results[2].txBytes;
      }
      utils.debug('getapp sample ' + JSON.stringify(ret));
      return Promise.resolve(ret);
    }).catch(() => {
      utils.debug('error getAppSamples');
      return Promise.resolve(ret);
    });
  }

  startMessage() {
    this.mobileMsg = navigator.b2g.mobileMessageManager;
    this.bindMessageHandler = this.messageHandler.bind(this);

    // Workround to receive events
    this.mobileMsg && this.mobileMsg.getMessage(0);
    this.mobileMsg && this.mobileMsg.addEventListener('sent', this.bindMessageHandler);
    this.mobileMsg && this.mobileMsg.addEventListener('received', this.bindMessageHandler);
  }

  messageHandler(e) {
    if (e.message.type !== 'sms') {
      return;
    }
    if (e.type == 'received') {
      this.accumulateSummary('message_in');
    } else if (e.type == 'sent') {
      this.accumulateSummary('message_out');
    }
  }

  startCall() {
    this._telephony = navigator.b2g.telephony;
    this.bindCallsChange = this.callsChange.bind(this);
    this.bindCallEnded = this.callEnded.bind(this);
    if (this._telephony) {
      this._telephony.addEventListener('callschanged', this.bindCallsChange);
    }
    window.addEventListener('serviceworkermessage', this.bindCallEnded);
  }

  callsChange(evt) {
    var length = this._telephony.calls.length;
    if (length > 0) {
      var call = this._telephony.calls[length - 1];
      call.onstatechange = this.callStateChange.bind(this);
      call.onerror = function callStateError() {
        this.onstatechange = null;
      }
    }

    if (evt.call && evt.call.state !== 'disconnected') {
      this.preState = evt.call.state;
      utils.debug('  preState changed to ' + this.preState);
    }
  }

  callStateChange(evt) {
    var call = evt.call;
    utils.debug(' callStateChange: ' + call.id.number + ',state:' + call.state);
    switch (call.state) {
      case 'connected':
        if (this.preState.indexOf('incoming') > -1) {
          // Emit call_start_in
          utils.debug(' call start incoming');
          var obj = {};
          this.isInContact(call.id.number).then(isContact => {
            obj.is_contact = isContact;
            this.networkActionStore.markAction('call_start_in', obj);
          });
        } else if (this.preState.indexOf('alerting') > -1) {
          // Emit call_start outgoing
          utils.debug(' call start outgoing');
          var obj = {};
          this.isInContact(call.id.number).then(isContact => {
            obj.is_contact = isContact;
            //TODO
            obj.call_method = 0;
            this.networkActionStore.markAction('call_start', obj);
          });
        }
        this.preState = 'connected';
        break;
      case 'disconnected':
        utils.debug(' callStateChange disconnected');
        call.onstatechange = null;
        break;
    }
  }

  callEnded(event) {
    if (event.detail.type !== 'telephony-call-ended') {
      return;
    }

    let call = event.detail.data;
    utils.debug(' callEnded: ');
    if (call.duration == 0) {
      if (call.direction === 'incoming' && call.hangUpLocal) {
        // incoming && reject
        utils.debug(': reject incoming');
        this.isInContact(call.number).then(isContact => {
          var obj = {};
          obj.is_contact = isContact;
          obj.caller_number = call.number;
          this.networkActionStore.markAction('call_reject', obj);
        });
      } else if (call.direction === 'incoming' && !call.hangUpLocal) {
        // incoming && missed
        utils.debug(': missed incoming');
        this.isInContact(call.number).then(isContact => {
          var obj = {};
          obj.is_contact = isContact;
          obj.caller_number = call.number;
          this.networkActionStore.markAction('call_missed', obj);
        });
      }
    } else {
      var duration = 0;
      if (call.direction === 'incoming') {
        duration = call.duration / 1000;
        this.accumulateSummary('call_seconds_in', duration);
        utils.debug('call_seconds_in', duration);
      } else if (call.direction === 'outgoing') {
        duration = call.duration / 1000;
        this.accumulateSummary('call_seconds_out', duration);
        utils.debug('call_seconds_out', duration);
      }
      this.isInContact(call.number).then(isContact => {
        var obj = {};
        obj.is_contact = isContact;
        obj.call_duration = duration;
        obj.direction = call.direction;
        this.networkActionStore.markAction('call_end', obj);
      });
    }
  }

  isInContact(num) {
    return new Promise((resolve, reject) => {
      Contacts.findByNumber(num, (contact) => {
        if (contact) {
          resolve(1);
        } else {
          resolve(0);
        }
      })
    })
  }

}

export default NetWorkTrafficCollector;
