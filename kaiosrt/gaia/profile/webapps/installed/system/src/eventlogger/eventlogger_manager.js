import EventDataManager from './event_data_manager';
import Scheduler from './scheduler';
import * as utils from './utils';
import { evldb } from './evl_db';
import DeviceInfoComposer from './device_info_composer';
import EVLConfig from './evl_config';

/*
* Simple constants used in this module.
*/
const IDLE = 'idle';
const ACTION = 'evl_action';
const REMOTE_EVENT = 'evl_remote_action';
const DB_CAPACITY = 'db_capacity';
const CONFIG_QUOTA = 'config_quota';
const BUFFER_SENT_SUCCESS = 'buffer_sent_success';
const TOKEN_EXPIRATION_TIME_SHIFT_IN_MS = 60 * 60 * 1000;
const TOKEN_EXPIRATION_10_MIN_IN_MS = 10 * 60 * 1000
const FIRST_EVENTS_SENT_KEY = 'first_events_sent';
const PRIORITY_HIGHT = 1;
const PRIORITY_ONFULL = 2;

// This is the list of event types we register handlers for
const EVENT_TYPES = [
  ACTION,
  DB_CAPACITY,
  CONFIG_QUOTA
];

export default class EventLoggerManager {
  constructor() {
  }

  // What setting do we listen to to get user conset to send data
  // to our server.
  TELEMETRY_CONSENT_KEY = 'eventlogger.telemetry.consent';
  // Observe the change and send user consent to server.
  TARGETING_CONSENT_KEY = 'eventlogger.targeting.consent';
  // For age consent.
  AGE_CONSENT_KEY = 'eventlogger.age.consent';

  // 3 minutes
  REPORT_TIMEOUT = 180000;
  // Server for sending data reports
  // Can be overridden with apps.serviceCenterUrl setting.
  REPORT_SERVER = 'https://api.kaiostech.com/v3.0';
  // Server endpoint for sending data reports
  REPORT_ENDPOINT = '/apps/metrics';

  IDLE_TIME = 15 * 1000; // ms

  // Telemetry payload version
  TELEMETRY_VERSION = 2;

  // App name (static for Telemetry)
  TELEMETRY_APP_NAME = 'eventlogger';

  DEVICE_INFO = null;

  // testing purpose
  DB = evldb;

  userConsentTimer = {};

  //
  // The EventLoggerManager constructor does no initialization of any sort.
  // By system app convention, the initialization code is in this start()
  // instance method instead. Note that this is not the same as the
  // startCollecting() method which is only called if the user has actually
  // opted in to telemetry.
  //
  start() {
    this.reset(); // initialize our state variables
    // We start collecting and do not need consent.
    // But we can send summaries only when user does not consent.
    this.startCollecting();
  }

  // This method shuts everything down and is only exposed for unit testing.
  // Note that this is not the same as the stopCollecting() method which is
  // used to stop data collection but keep the module running.
  stop() {
    this.stopCollecting();
    SettingsObserver.unobserve(this.TELEMETRY_ENABLED_KEY,
      this.isConsentEnabled.bind(this));
  }

  // Reset (or initialize) the EventLoggerManager instance variables
  reset() {
    // Are we collecting data? This is set to true by startCollecting()
    // and set to false by stopCollecting()
    this.collecting = false;

    // This is object is used to record the device info reading from settings
    this.DEVICE_INFO = null;

    // This is the server URL of receiving metrics data
    this.url = null;

    // Send compressed data on default
    this.compressDataOn = true;
  }

  // Start collecting app usage data. This function is only called if the
  // appropriate setting is turned on. The done callback is called when
  // setup is complete, but this feature is only needed for tests.
  startCollecting(done) {
    var self = this;

    utils.debug('starting app usage metrics collection');

    // If we're already running there is nothing to start
    if (this.collecting) {
      return;
    }
    this.collecting = true;

    SettingsObserver.observe(this.TELEMETRY_CONSENT_KEY, false,
      this.isConsentEnabled.bind(this));
    SettingsObserver.observe(this.TARGETING_CONSENT_KEY, false,
      this.isTargetingEnabled.bind(this));
    SettingsObserver.observe(this.AGE_CONSENT_KEY, false,
      this.isAgeEnabled.bind(this));

    // retry listener.
    this.bindRetryTransmit = this.retryTransmit.bind(this);

    getConfigurationSettings();

    // allowing values in the settings database to override the defaults.
    function getConfigurationSettings() {
      // Settings to query, mapped to default values
      var query = {
        'apps.serviceCenterUrl': self.REPORT_SERVER,
        'deviceinfo.cu': '',
        'app.update.custom': '',
        'deviceinfo.platform_build_id': '',
        'deviceinfo.build_number': '',
        'metrics.sending.compressed': true
      };

      var retries = 0;
      function getSettingsAndRun() {
        retries++;
        utils.getSettings(query, function (result) {
          self.allGet = Object.keys(query).every(key => {
            return ((result[key] || result[key] === false) && result[key] !== '');
          })
          if (self.allGet || retries == 5) {
            utils.debug('All settings get');
            utils.debug(result['deviceinfo.cu']);
            utils.debug(result['app.update.custom']);
            utils.debug(result['apps.serviceCenterUrl']);
            self.url = result['apps.serviceCenterUrl'] + self.REPORT_ENDPOINT;
            self.compressDataOn = result['metrics.sending.compressed'];
            // Move on to the next step in the startup process
            self.DEVICE_INFO = result;
            // Move on to the next step in the startup process
            registerHandlers();
          } else {
            utils.debug('try again');
            utils.debug('self.allGet ' + self.allGet);
            // In order to get non-empty values, we should retry to get values.
            self.timer = setTimeout(getSettingsAndRun, 5000);
          }
        });
      }

      clearTimeout(self.timer);
      getSettingsAndRun();
    }

    async function registerHandlers() {
      // Basic event handlers
      EVENT_TYPES.forEach(function (type) {
        window.addEventListener(type, self);
      });

      self.eventDataManager = new EventDataManager();
      self.scheduler = new Scheduler();
      self.evlConfig = await EVLConfig.create();
      var quota = self.evlConfig.config.buffer_size;
      evldb.setQuota(quota);
      // DB init
      await evldb.init();
      // testing ONLY
      window.scheduler = self.scheduler;

      self.idleObserver = {
        time: self.IDLE_TIME,
        onidle: function () {
          self.handleEvent(new CustomEvent(IDLE));
        },
        onactive: function () {
        }
      };
      // Register for idle events
      if (!self.idleTimer) {
        self.idleTimer = window.idleTimer;
      }
      self.idleTimer.setIdleTimeout(self.idleObserver);
        
      window.addEventListener(REMOTE_EVENT, self);

      self.startScheduler();

      self.checkAndGenFirstEvents();

      if (done) {
        done();
      }
    }
  }

  // Stop collecting app usage data and discard any we have already collected.
  // This is called if the setting is turned off.
  stopCollecting() {
    utils.debug('stopping app usage data collection and deleting stored data');

    clearInterval(this.timer);

    // If we're not already running there is nothing to stop
    if (!this.collecting) {
      return;
    }
    this.collecting = false;

    var self = this;
    EVENT_TYPES.forEach(function (type) {
      window.removeEventListener(type, self);
    });

    window.removeEventListener(REMOTE_EVENT, self);

    self.idleTimer.clearIdleTimeout();

    this.removeSchduler();
    this.eventDataManager.stop();
    this.eventDataManager = null;
    this.evlConfig = null;

    // Reset our state, discarding local copies of metrics and deviceID
    this.reset();
  }

  //
  // This is the heart of this module. It listens to the various events and
  // 1) records app usage data
  // 2) persists app usage data at appropriate times
  // 3) transmits app usage data at appropriate times
  //
  handleEvent(e) {
    utils.debug('got an event: ', e.type);
    switch (e.type) {
      case IDLE:
        this.evlConfig.getOnlineConfig();
        break;
      case ACTION:
        var data = e.detail;
        utils.debug('action event');
        utils.debug(e);
        this.sendOrSave(data);
        break;
      case REMOTE_EVENT:
        this.handleRemoteData(e.detail);
        break;
      case DB_CAPACITY:
        // Do not duplicate if transmitAll is ongoing
        if (e.detail.isFull && window.isOnline() && !this.bTransmitAll) {
          clearTimeout(this.transmitOnFullTimer);
          this.transmitOnFullTimer = setTimeout(this.transmitOnFull.bind(this), 10000);
        }
        break;
      case CONFIG_QUOTA:
        var quota = parseInt(e.detail.buffer_size);
        if (!isNaN(quota)) {
          evldb.setQuota(quota);
        }
        break;
    }
  }

  startScheduler() {
    this.scheduler.addEventListener('summaryAlarming', e => {
      this.stopRetry();
      this.transmitSummary();
      // Check and update config
      this.evlConfig.getOnlineConfig();
    });
    this.scheduler.addEventListener('wifi_connected', e => {
      this.evlConfig.getOnlineConfig();
      this.stopRetry();
      this.checkAndSendActions();
    });
    this.scheduler.addEventListener('cell_connected', e => {
      this.evlConfig.getOnlineConfig();
      this.stopRetry();
      this.checkAndSendActions();
    });
    // Call start last to make sure receiving first event
    this.scheduler.start();
  }

  removeSchduler() {
    this.scheduler.stop();
    this.scheduler.event_callbacks = null;
    this.scheduler.event_callbacks = {};
    this.scheduler = null;
  }

  isSending() {
    return this.sending || (this.scheduler && this.scheduler.retryRunning);
  }

  stopRetry() {
    utils.debug('stopRetry');
    this.scheduler.removeEventListener('retryAlarming', this.bindRetryTransmit);
    this.scheduler.removeRetryAlarm();
  }

  sendOrSave(action) {
    if (!action || (Array.isArray(action) && action.length === 0)) {
      return;
    }

    if (this.isSending() || !window.isOnline()) {
      this.addToDb(action);

      return;
    }

    var dataSave = [];
    var dataSend = [];
    var tmp = [].concat(action);

    tmp.forEach(item => {
      if (this.checkSend(item)) {
        dataSend.push(item);
      } else {
        dataSave.push(item);
      }
    })

    if (dataSave.length > 0) {
      this.addToDb(dataSave);
    }
    if (dataSend.length > 0) {
      this.sending = true;
      //Save the data in case device power off.
      //Delete them when sent success.
      var sendOrRetry = function (dataSend, pKeysSending) {
        this.send(dataSend).then(r => {
          this.sending = false;
          this.DB.deleteRecords(pKeysSending);
          utils.debug('sendOrSave  sent!!!');
          // We are good here, Maybe we should send all prioriy 1 in buffer
        }, e => {
          utils.debug('sendOrSave retrying');
          this.sending = false;
          if (!this.scheduler.retryRunning) {
            this.scheduler.addEventListener('retryAlarming', this.bindRetryTransmit);
            this.scheduler.newRetryAlarm(dataSend, pKeysSending);
          }
        });
      }.bind(this);
      this.addToDb(dataSend).then(pKeys => {
        utils.debug('addToDb and sending pKeys ' + pKeys);
        utils.debug(pKeys);
        sendOrRetry(dataSend, pKeys);
      }).catch(() => {
        //Something wrong to save DB, or it's full.
        //We are still sending it.
        sendOrRetry(dataSend);
      });
    } else {
      // Try to send data in DB
      this.checkAndSendActions();
    }
  }

  checkSend(record) {
    let ret = false;
    // When users consent, no need to check config
    // When users do not consent, check the config
    // Only send data types with consent are not needed.
    if (this.consentRequiredMet(record)) {
      if (this.evlConfig.getPriority(record) == PRIORITY_HIGHT ||
        (this.evlConfig.getPriority(record) == PRIORITY_ONFULL && evldb.isFull) ||
        this.scheduler.hasWifiConnection()) {
        ret = true;
      }
    }

    return ret;
  }

  // Either users consent or the consnet is not needed to the type
  consentRequiredMet(record) {
    return this.consentEnabled || !this.evlConfig.consentNeeded(record);
  }

  addToDb(action) {
    if (!action) {
      return Promise.reject();
    }
    var arrData = [].concat(action);
    var p = [];
    arrData.forEach(data => {
      var pirority = this.evlConfig.getPriority(data);
      p.push(this.addObj(data, pirority));
    });

    return Promise.all(p).then(results => {
      return Promise.resolve(results);
    }).catch(e => {
      utils.debug('addToDb exception');
      return Promise.reject(e);
    })
  }

  addObj(obj, pirority) {
    return evldb.add(obj, pirority);
  }

  retryTransmit(e) {
    if (e.data && !e.stopped && window.isOnline()) {
      utils.debug('sendRetry');
      this.send(e.data).then(result => {
        utils.debug('Event Logger retry transmission Summary success: ', result);
        this.DB.deleteRecords(e.keys).then(() => {
          // We have good connection, tries to send data with high pirority.
          this.transmitPriorityHigh();
        });
        this.stopRetry();
      }, e => {
        if (this.scheduler.needStopRetry()) {
          this.stopRetry();
        }
        // No thing to do here, wait for next alarm
        utils.debug('Event Logger retry transmission Summary failure:', e);
      });
    } else if (e.data && !e.stopped && !window.isOnline()) {
      utils.debug('connection failed during retry, save data to db');
      this.stopRetry();
    } else if (e.stopped) {
      // Scheduler stopped because retry exceeded
      utils.debug('Retry failed, add data to db');
      this.stopRetry();
    }
  }

  checkAndSendActions() {
    if (this.bTransmitAll) {
      utils.debug(`checkAndSendActions ${this.bTransmitAll} return`);
      return;
    }
    if (this.scheduler.hasWifiConnection()) {
      // We wait all the other network actions stop
      clearTimeout(this.transmitAllTimer);
      this.transmitAllTimer = setTimeout(this.transmitAll.bind(this), 10000);

      // Avoid duplicate
      clearTimeout(this.transmitPrioHighTimer);
      clearTimeout(this.transmitOnFullTimer);
    } else {
      // We wait all the other network actions stop
      clearTimeout(this.transmitPrioHighTimer);
      this.transmitPrioHighTimer = setTimeout(this.transmitPriorityHigh.bind(this), 10000);
      if (evldb.isFull) {
        clearTimeout(this.transmitOnFullTimer);
        this.transmitOnFullTimer = setTimeout(this.transmitOnFull.bind(this), 10000);
      }
    }
  }

  async transmitAll() {
    utils.debug('transmitAll');
    this.bTransmitAll = true;

    const db_result = await evldb.getAllWithConsent(
      this.consentEnabled,
      this.evlConfig.config.chunk_size
    ).catch((err) => {
      console.error("Read db error" + err);
    });

    if (!db_result) {
      this.bTransmitAll = false;
      return;
    }

    const {items, keys} = db_result;
    if (Array.isArray(items) && items.length === 0) {
      utils.debug(`transmitAll no data found for consent ${this.consentEnabled}`);
      this.bTransmitAll = false;
      return;
    }
    const result = await this.send(items).catch((err) => {
      utils.debug('transmitAll falied', err);
    });
    if (!result) {
      this.bTransmitAll = false;
      return;
    }

    utils.debug('All sent and deleteing keys' + keys);
    await evldb.deleteRecords(keys);
    // For data buffer summary
    asyncStorage.setItem(BUFFER_SENT_SUCCESS, Date.now());

    // Try next round
    this.transmitAll();
  }

  getTypesOnConsent(types) {
    var ret = [];
    types.forEach((type) => {
      if (this.consentRequiredMet(type)) {
        ret.push(type);
      }
    })

    return ret;
  }

  transmitPriorityHigh() {
    utils.debug('transmitPriorityHigh');
    this.readAndSend(PRIORITY_HIGHT);
  }

  transmitOnFull() {
    utils.debug('transmitOnFull');
    this.readAndSend(PRIORITY_ONFULL);
  }

  async readAndSend(priority) {
    const result = await evldb.getPriorityWithConsent(this.consentEnabled,
      priority,
      this.evlConfig.config.chunk_size
    ).catch((err) => {
      console.error("Read db error" + err);
    });

    if (!result) {
      return;
    }

    const {items, keys} = result;
    if (Array.isArray(items) && items.length === 0) {
      utils.debug(`readAndSend no data found for
        priority ${priority} and consent ${this.consentEnabled}`);
      return;
    }

    await this.send(items).catch((err) => {
      utils.debug('Event Logger readAndSend failure: ', err);
    });

    if (this.testKeepData) {
      return;
    }
    utils.debug('readAndSend success clearing DB');
    await evldb.deleteRecords(keys);
  }

  transmitSummary() {
    return new Promise((resolve, reject) => {
      this.eventDataManager.packSummary().then(data => {
        this.sendOrSave(data);
      }, e => {
        //reject({ reason: 'no data' });
        utils.debug('No data available');
      });
    })
  }

  send(data) {
    var params = {
      did: this.DEVICE_INFO['app.update.custom'],
      curef: this.DEVICE_INFO['deviceinfo.cu'],
      version: this.TELEMETRY_VERSION,
      data: window.btoa(JSON.stringify([].concat(data)))
    };
    utils.debug('sending data ');
    utils.debug(data);

    return Promise.all([this.compressData(params),
      this.getRestrictedToken()])
      .then(result => {
        var requester = new Requester(this.REPORT_TIMEOUT);
        requester.setDeviceInfo({
          ct: DeviceInfoComposer.connectionType(),
          utc: DeviceInfoComposer.getTimeStamp(),
          utcOff: DeviceInfoComposer.getTimeZoneOffset(),
          buildID: this.DEVICE_INFO['deviceinfo.platform_build_id'],
          buildNumber: this.DEVICE_INFO['deviceinfo.build_number']
        })
        requester.setHawkCredentials(result[1].kid, result[1].macKey);

        var payload = {
          url: this.url,
          method: 'POST',
          params: params
        };

        if (result[0]) {
          payload.paramsCompressed = result[0];
          payload.extraHeaders = {'Content-Encoding': 'gzip'};
        }

        return requester.send(payload);
      }, e => {
        utils.debug("getRestrictedToken Promise.reject()");
        return Promise.reject(e);
      }).then(result => {
        this.checkAndSendActions();
        return Promise.resolve(result);
      }, e => {
        // Invalid token to get a new one
        if (e && e.status == 401) {
          this.cachedRestrictedToken = null;
          this.tokenExpirationDate = 0;
        }
        console.error('[ELM] Error sending ' + e.status);
        console.error('[ELM] Error sending ' + e.responseText);
        return Promise.reject(e);
      }).catch(error => {
        return Promise.reject(error);
      });
  }

  compressData(data) {
    return new Promise(resolve => {
      if (!this.compressDataOn) {
        // Compress data off
        return resolve('');
      }

      var sParams = '';
      try {
        sParams = JSON.stringify(data);
      }
      catch (e) {
        utils.debug('sending data params can not stringify');
        return resolve('');
      }

      LazyLoader.load(['js/gzip/gzip.js'], () => {
        Gzip.compress(sParams).then((gzipData) => {
          utils.debug('Length of compressed data:', gzipData.length);
          resolve(gzipData);
        }, (e) => {
          utils.debug('Error compressing data:', e);
          resolve('');
        })
      })
    })
  }

  getRestrictedToken() {
    return new Promise((resolve, reject) => {
      if (this.cachedRestrictedToken && this.tokenExpirationDate > Date.now()) {
        // use cached token
        resolve(this.cachedRestrictedToken);

        return;
      }
      // fetch restricted token
      navigator.b2g.authorizationManager.getRestrictedToken('service')
        .then((credential) => {
          var expires_in = 0;
          if ('expiresInSeconds' in credential) {
            expires_in = credential.expiresInSeconds * 1000;
            expires_in -= TOKEN_EXPIRATION_TIME_SHIFT_IN_MS;
          } else {
            expires_in = TOKEN_EXPIRATION_10_MIN_IN_MS;
          }
          this.cachedRestrictedToken = credential;
          this.tokenExpirationDate = expires_in + Date.now();
          resolve(this.cachedRestrictedToken);
        }).catch((e) => {
          utils.debug("getRestrictedToken failed with status: " + e);
          this.cachedRestrictedToken = null;
          this.tokenExpirationDate = 0;
          reject();
        });
    })
  }

  saveUerConsent(type, isConsent) {
    // Avoid generating duplicate actions,
    // When user keeps cheking and un-checking.
    clearTimeout(this.userConsentTimer[type]);
    this.userConsentTimer[type] = setTimeout(() => {
      DeviceInfoComposer.getStandardPackage().then(p => {
        utils.debug('saveUerConsent', type, isConsent);
        p['event_type'] = type;
        p['data'] = { consent: isConsent };

        this.sendOrSave(p);
      });
    }, 10000);
  }

  async checkAndGenFirstEvents() {
    let sent = await this.checkFirstEventsSent();
    if (!FtuLauncher.isFtuRunning() && !sent) {
      // When User finishes FTU quickly
      this.sendFirstEvents();
      utils.debug('!FtuLauncher.isFtuRunning() && !this.checkFirstEventsSent()');
    } else if (FtuLauncher.isFtuRunning() && !sent) {
      // Normal case when User finish FTU
      utils.debug('FtuLauncher.isFtuRunning() && !this.checkFirstEventsSent()');
      // Check and Generate consent once at FTU
      window.addEventListener('ftudone', () => {
        this.sendFirstEvents();
      });
      window.addEventListener('ftuskip', () => {
        this.sendFirstEvents();
      });
    } else {
      // Do nothing for normal bootup
      utils.debug('Do nothing for normal bootup, firstEventsChecked true');
      this.firstEventsChecked = true;
    }
  }

  sendFirstEvents() {
    var composeConsent = function (base, type, isConsent) {
      var packData = JSON.parse(JSON.stringify(base));
      packData['event_type'] = type;
      packData['data'] = { consent: isConsent };

      return packData;
    };

    var composePreloadedEvent = function (base, preloaded) {
      var packData = JSON.parse(JSON.stringify(base));
      packData['event_type'] = 'apps_preloaded';
      packData['data'] = preloaded;
      utils.debug('composePreloadedEvent ' + packData);

      return packData;
    };

    Promise.all([this.eventDataManager.appStatusCollector.getCurrentInventory(),
      DeviceInfoComposer.getStandardPackage()]).then(results => {
      utils.debug('sendFirstEvents');
      var all = [];
      all.push(composeConsent(results[1], 'telemetry_consent', this.consentEnabled));
      all.push(composeConsent(results[1], 'targeting_consent', this.targetingConsent));
      all.push(composeConsent(results[1], 'age_consent', this.ageConsent));
      all.push(composePreloadedEvent(results[1], results[0]));

      asyncStorage.setItem(FIRST_EVENTS_SENT_KEY, 1);
      this.firstEventsChecked = true;
      this.sendOrSave(all);
    });
  }

  async checkFirstEventsSent() {
    return await utils.getItem(FIRST_EVENTS_SENT_KEY) == 1
  }

  isConsentEnabled(value) {
    utils.debug('telemetry_consent', value);
    this.consentEnabled = value;
    // Send consent after FTU and every bootup check
    if (this.firstEventsChecked) {
      this.saveUerConsent('telemetry_consent', value);
    }
  }

  isTargetingEnabled(value) {
    this.targetingConsent = value;
    utils.debug('targeting_consent', value)
    // Send consent after FTU
    if (this.firstEventsChecked) {
      this.saveUerConsent('targeting_consent', value);
    }
  }

  isAgeEnabled(value) {
    this.ageConsent = value;
    utils.debug('age_consent', value)
    // Send consent after FTU
    if (this.firstEventsChecked) {
      this.saveUerConsent('age_consent', value);
    }
  }

  handleRemoteData(source) {
    var data = source.data;
    utils.debug('external event received');
    // We can save the event_type which is not in the config list.
    // The priority will be 3 on default.
    // The config list can be updated later with connection.
    // Then this event_type can be handled correctly(priority wise).
    if (data && data.event_type) {
      DeviceInfoComposer.getStandardPackage().then(p => {
        // Align the data format
        p['event_type'] = data.event_type;
        delete data.event_type;
        p['data'] = data.data || data;
        this.sendOrSave(p);
      })
    }
  }
};
