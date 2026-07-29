import React from 'react';
import BaseComponent from 'base-component';
import BaseModule from 'base-module';

const ALARM_TIME = {
  MILLISECONDS_1HR: 1 * 60 * 60 * 1000, //1hr
  MILLISECONDS_2HR: 2 * 60 * 60 * 1000, //2hrs
  MILLISECONDS_4HR: 4 * 60 * 60 * 1000, //4hrs
  MILLISECONDS_8HR: 8 * 60 * 60 * 1000, //8hrs
  MILLISECONDS_16HR: 16 * 60 * 60 * 1000, //16hrs
  MILLISECONDS_24Hr: 24 * 60 * 60 * 1000 //24hrs
};

const STATE_NOT_READY = -1;
const STATE_IDEL = 0;
const STATE_GETTINGAPPLIST = 1;
const STATE_INSTALLING = 2;
const GETAPP_URL_ENDPOINT = '/apps?cu=';
const BATTERY_LIMIT = .3;
const CONFIG_TIMER = 10000;

export default class SilentAppInstallManager extends BaseModule {

  constructor() {
    super();
    this.debug('SilentAppInstallManager  start');
    this.installedApps = [];
    this.uninstalledApps = [];
    this.silentApps = new Map();
    this.silentInstalledApps = [];
    this.silentFailedApps = [];
    this._nextAutoUpdateAlarmDate = null;
    this.silentInstallTimer = ['MILLISECONDS_1HR', 'MILLISECONDS_2HR',
      'MILLISECONDS_4HR', 'MILLISECONDS_8HR', 'MILLISECONDS_16HR', 'MILLISECONDS_24Hr'];
    this.launchTimer = null;
    this.serviceCenterURL = '';
    this.curRef = '';
    this.DEBUG = false;
    this.state = STATE_NOT_READY;
    this.name = 'SilentAppInstallManager';
    this.alrmCallBack = null;
    this.deviceImei = '';
    this.getImei();
    this.getConfigurationSettings();
    this.isAnyFailure = false;
    window.asyncStorage.getItem('first_time_install', (value) => {
      if (!value) {
        this.isFirstInterval = true;
        window.asyncStorage.setItem('first_time_install', true);
      } else {
        this.isFirstInterval = value;
      }
      this.debug('isFirstInterval' + this.isFirstInterval);
    });
  }

  reset() {
    this.installedApps = [];
    this.uninstalledApps = [];
    this._nextAutoUpdateAlarmDate = null;
    this.launchTimer = null;
  }

  resetLaunchTimer() {
    if (this.launchTimer) {
      clearInterval(this.launchTimer);
    }
    this.launchTimer = null;
  }

  getImei() {
    this.debug('!!! getImei');
    if (!navigator.b2g.mobileConnections) {
      console.warn('No navigator.b2g.mobileConnections!');
      return;
    }

    const deviceId = navigator.b2g.mobileConnections[0].getDeviceIdentities();
    if (deviceId.imei) {
      this.deviceImei = deviceId.imei;
    } else {
      let errorMsg = 'Could not retrieve the IMEI code for SIM0 ';
      console.warn(errorMsg);
    }
    this.debug('getImei deviceInfo.imei : ' + this.deviceImei);
  }

  start() {
    let self = this;
    this.debug('!!! start SilentAppInstallManager');
    window.addEventListener('metricsready', this);
    window.addEventListener('ftudone', this);
    window.addEventListener('schedule_alarm', this);
    window.addEventListener('silent_install', this);
    window.addEventListener('applicationinstall-success', this);
    window.addEventListener('applicationinstall-failed', this);
    window.addEventListener('applicationuninstall', this);
    window.addEventListener('fota-upgrade-success', this);
    window.addEventListener('timechange', this);
    AlarmMessageHandler.addCallback((message) => {
      self.debug("!!! alarm fired: " + JSON.stringify(message.data));
      if (message.data && message.data.type === 'silentInstall') {
        window.dispatchEvent(new CustomEvent('schedule_alarm'));
      }
    });
    this.getData();
    this.isAnySilentAlarm();
  }

  getConfigurationSettings() {
    this.debug(' !!! getConfigurationSettings');
    let settingsQuery = {
      'apps.serviceCenterUrl': '',
      'deviceinfo.cu': '4044O-2BAQUS1-R',
      'debugger.remote-mode': 'disabled'
    };
    let self = this;
    let counter = 0;
    let timer = setInterval(function() {
      self.getSettings(settingsQuery, function(result) {
        self.debug(' getConfigurationSettings result:: '+JSON.stringify(result));
        self.DEBUG = result['debugger.remote-mode'] !== 'disabled' ? true : false;
        self.serviceCenterURL = result['apps.serviceCenterUrl'];
        self.curRef = result['deviceinfo.cu'];
        self.debug(' getConfigurationSettings result:: ' +
          self.serviceCenterURL + '::' + self.curRef);
        if (self.serviceCenterURL && self.serviceCenterURL !== '' &&
          self.curRef && self.curRef !== '') {
          clearInterval(timer);
          self.start();
        }
      });
    }, CONFIG_TIMER);
  }

  getSettings(settingKeysAndDefaults, callback) {
    let results = {};
    let promiseArray = [];
    let self = this;
    for (let key in settingKeysAndDefaults) {
      let defaultValue = settingKeysAndDefaults[key];
      promiseArray.push(SettingsObserver.getValue(key).then((value) => {
        if (value === undefined || value === null || value === '') {
          value = defaultValue;
        }
        results[key] = value;
        self.debug(key + ' ' + JSON.stringify(value));
      }));
    }
    Promise.all(promiseArray).then(function() {
      self.debug( JSON.stringify(results));
      callback(results);
    });
  }

  handleEvent(e) {
    this.debug('!!! handleEvent :: ' + e.type);
    switch (e.type) {
      case 'metricsready':
        this.state = this.state === STATE_NOT_READY ?  STATE_IDEL : this.state;
        this.debug('Metricsready' + this.state);
        if (!Service.query('isFtuRunning')) {
          this.isAnySilentAlarm().then((isAlarm) => {
            if (!isAlarm) {
              this.isAnyFailure = true;
              this.setNextSilentInstallAlarm();
              this.debug('After reboot no silent alarm, So set silent Alarm');
            }
          });
        }
        break;
      case 'fota-upgrade-success':
      case 'ftudone':
        this.debug('!!! installedApps.length' + this.installedApps.length + ':: this.state,' + this.state);
        if (this.installedApps.length > 0 && this.checkPrerequisite() &&
          this.state === STATE_IDEL) {
          this.sendRequest();
        } else {
          this.isAnyFailure = true;
          this.setNextSilentInstallAlarm();
        }
        break;
      case 'schedule_alarm':
        this.debug('!!! schedule_alarm :: ' + this.checkPrerequisite() + ' : state : ' + this.state);
        if (this.checkPrerequisite()) {
          if (this.silentApps.size < 1 && this.state === STATE_IDEL) {
            this.sendRequest();
          } else if (this.state === STATE_NOT_READY || this.state === STATE_IDEL) {
            this.isAnyFailure = true;
            this.setNextSilentInstallAlarm();
          }
        } else {
          this.isAnyFailure = true;
          this.setNextSilentInstallAlarm();
        }
        break;
      case 'silent_install':
        this.state = STATE_INSTALLING;
        let installApp = this.silentApps.values().next().value;
        this.installApplication(installApp);
        break;
      case 'applicationinstall-success':
        this.debug('applicationinstall-success' + e.detail.application.manifestUrl);
        let app = e.detail.application;
        this.installedApps.push(app.manifestUrl);
        if (this.uninstalledApps.indexOf(app.manifestUrl) > -1) {
          this.uninstalledApps.splice(this.uninstalledApps.indexOf(app.manifestUrl), 1);
          window.asyncStorage.setItem('silent_uninstalled_apps', JSON.stringify(this.uninstalledApps));
        }
        this.removeFromAppList(app);
        break;
      case 'applicationinstall-failed':
        this.debug('applicationinstall-failed' + e.detail.application.manifestUrl);
        let appobj = e.detail.application;
        this.silentFailedApps.push(appobj.manifestUrl);
        this.isAnyFailure = true;
        this.removeFromAppList(appobj);
        break;
      case 'applicationuninstall':
        let deletedapp = e.detail.application;
        if (this.silentFailedApps.pop() === deletedapp.manifestUrl)  {
          return;
        }
        window.asyncStorage.getItem('silent_uninstalled_apps', (value) => {
          if (value) {
            this.uninstalledApps = JSON.parse(value);
          }
          if (this.uninstalledApps.indexOf(deletedapp.manifestUrl) < 0) {
            this.uninstalledApps.push(deletedapp.manifestUrl);
          }
          window.asyncStorage.setItem('silent_uninstalled_apps', JSON.stringify(this.uninstalledApps));
          if (this.installedApps.indexOf(deletedapp.manifestUrl) > -1) {
            this.installedApps.splice(this.installedApps.indexOf(deletedapp.manifestUrl), 1);
          }
          this.debug('!!! applicationuninstall :: ' + deletedapp.manifestUrl);
        })
        break;
      case 'timechange':
        let currentAlarm = this._nextAutoUpdateAlarmDate;
        let currentTime = Date.now();
        this.debug(' Current Alarm :: ' + currentAlarm.getTime() + '   currentTime :: ' + currentTime);
        if (currentAlarm.getTime() - currentTime > 86400000) {
          this.debug('Alarm need to reset');
          this.resetSilentAlarm();
        }
        break;
    }
  }

  resetSilentAlarm() {
    debug('resetSilentAlarm' );
    if (navigator.b2g && navigator.b2g.alarmManager) {
      navigator.b2g.alarmManager.getAll().then(
        (result) => {
          for (let i = 0; i < result.length; i++) {
            if (result[i].data.type === 'silentInstall') {
              this.debug('reset silentInstall ' + result[i].id);
              navigator.b2g.alarmManager.remove(result[i].id);
            }
          }
          this.debug('resetSilentAlarm onsuccess');
          this.setNextSilentInstallAlarm();
        },
        () => {
          this.debug('resetSilentAlarm onerror');
        }
      );
    }
  }

  checkPrerequisite() {
    this.debug('!!! navigator.onLine:: ' + window.isOnline() + ',::' +
      navigator.battery.level);
    return window.isOnline() && navigator.battery.level > BATTERY_LIMIT ;
  }

  sendRequest() {
    let url = this.serviceCenterURL + GETAPP_URL_ENDPOINT + this.curRef +
      '&imei=' + this.deviceImei;
    this.debug('!!! sendRequest  url :: '+ url);
    let xhr = new XMLHttpRequest({ mozSystem: true, mozAnon: true });

    xhr.open('GET', url, true);
    xhr.timeout = 20000;
    xhr.setRequestHeader('Content-type', 'application/json');
    xhr.responseType = 'text';
    xhr.send();
    let self = this;
    this.state = STATE_GETTINGAPPLIST;
    xhr.onload = function(e) {
      if (e.target.status == 200) {
        self.isAnyFailure = false;
        self.handleOnload(this.responseText);
      } else {
        self.debug('!!! Response status not ok' + e.target.status);
        self.isAnyFailure = true;
        self.setNextSilentInstallAlarm();
      }
    };
    xhr.onerror = function() {
      self.isAnyFailure = true;
      self.handleOnerror(this.responseText);
    };
    xhr.onabort = function() {
      self.isAnyFailure = true;
      self.handleOnabort();
    };
    xhr.ontimeout = function() {
      self.isAnyFailure = true;
      self.handleOntimeout();
    };
    return xhr;
  }

  installApplication(app) {
    this.debug(' installApplication app.type :: '+ app.type);
    let self = this;
    if (this.uninstalledApps.includes(app.manifest_url) ||
      this.installedApps.includes(app.manifest_url)) {
      this.debug('!!! Already installed or uninstalled' + app.manifest_url);
      this.removeFromAppList(app);
      return;
    }
    if (app.type === 'hosted') {
      this.install(app.manifest_url).then(() => {
        self.debug('!!! installApplication success');
      }, (result) => {
        console.warn('!!! installApplication error:' + JSON.stringify(result));
          self.isAnyFailure = true;
          self.removeFromAppList(app);
      });
    } else {
      this.installPackage(app.manifest_url).then((url) => {
        self.debug('!!! installApplication package success');
      }, (result) => {
        console.warn('!!! installApplication error:' + JSON.stringify(result));
          self.isAnyFailure = true;
          self.removeFromAppList(app);
      });
    }
  }

  removeFromAppList(app) {
    let manifestUrl = app.manifestUrl || app.manifest_url;
    if (!this.silentApps.has(manifestUrl)) return;
    this.silentApps.delete(manifestUrl);
    this.debug('!!! removeFromAppList apps size :: ' + this.silentApps.size);
    if (this.silentApps.size > 0) {
      window.dispatchEvent(new CustomEvent('silent_install'));
    } else {
      this.setNextSilentInstallAlarm();
    }
  }

  installPackage(manifestUrl) {
    let self = this;
    this.debug('!!! installPackage function ' + manifestUrl);
    return new Promise((resolve, reject) => {
      AppsManager.getAll().installPackage(manifestUrl).then(() => {
        self.debug('!!! installPackage onsuccess' + manifestUrl);
        resolve();
      }, () => {
        self.debug('!!! installPackage onerror' + manifestUrl);
        reject({'error': request.error.name});
      });
    });
  }

  install(manifestUrl) {
    this.debug('!!! install function ' + manifestUrl);
    return new Promise((resolve, reject) => {
      let request = AppsManager.install(manifestUrl).then(() => {
        self.debug('!!! install onsuccess' + manifestUrl);
        resolve();
      }, (err) => {
        self.debug('!!! install onerror' + manifestUrl);
        reject({'error': err});
      });
    });
  }

  setNextSilentInstallAlarm() {
    this.debug('!!! setNextSilentInstallAlarm  isFirstInterval: ' + this.isFirstInterval +
      ': isAnyFailure : ' + this.isAnyFailure);
    if (this.isFirstInterval && !this.isAnyFailure) {
      this.isFirstInterval = false;
      window.asyncStorage.setItem('first_time_install', false);
      this.addAutoUpdateAlarm(ALARM_TIME.MILLISECONDS_24Hr);
      this.state = STATE_IDEL;
      window.asyncStorage.setItem('next_silent_alarm', 'MILLISECONDS_24Hr');
      this.debug(' !!! setNextSilentInstallAlarm: next_alarm:: ALARM_TIME.MILLISECONDS_24Hr');
      return;
    }

    this.getNextAlarmInterval().then((next_alarm) => {
      if (!next_alarm) {
        this.addAutoUpdateAlarm(ALARM_TIME.MILLISECONDS_1HR);
        window.asyncStorage.setItem('next_silent_alarm', 'MILLISECONDS_1HR');
        this.debug('!!! setNextSilentInstallAlarm: next_alarm:: MILLISECONDS_1HR');
      } else {
        if (ALARM_TIME[next_alarm]) {
          this.addAutoUpdateAlarm(ALARM_TIME[next_alarm]);
          window.asyncStorage.setItem('next_silent_alarm', next_alarm);
          if (next_alarm === 'MILLISECONDS_24Hr') {
            this.isFirstInterval = false;
          }
        } else {
          this.isFirstInterval = false;
          this.addAutoUpdateAlarm(ALARM_TIME.MILLISECONDS_24Hr);
          window.asyncStorage.setItem('next_silent_alarm', 'MILLISECONDS_24Hr');
        }
        this.debug(' !!! setNextSilentInstallAlarm: next_alarm::' + next_alarm +
          ': ALARM_TIME[next_alarm] ::' + ALARM_TIME[next_alarm]);
      }
      this.state = STATE_IDEL;
    });
  }

  getNextAlarmInterval() {
    return new Promise((resolve) => { 
      window.asyncStorage.getItem('next_silent_alarm', (current_alarm) => {
        let timerLength = this.silentInstallTimer.length;
        if (!current_alarm) {
          resolve(null);
        } else {
          let timerIndex = this.silentInstallTimer.indexOf(current_alarm);
          if (timerIndex !== -1 && ((timerIndex + 1) < timerLength)) {
            resolve(this.silentInstallTimer[timerIndex + 1]);
          } else {
            resolve(this.silentInstallTimer[timerLength - 1]);
          }
        }
      });
    });
  }

  addAutoUpdateAlarm(interval) {
    this.isAnySilentAlarm().then((value) => {
      this.debug('addAutoUpdateAlarm isAnySilentAlarm' + value);
      if (value || interval <= 0) {
        this.debug('addAutoUpdateAlarm, interval=' + interval +
        '; no need to add alarm');
        return;
      } else {
        const alarmDate = new Date(Date.now() + interval);
        if (navigator.b2g && navigator.b2g.alarmManager) {
          navigator.b2g.alarmManager.add({
            date: alarmDate,
            data: { type: 'silentInstall' },
            ignoreTimezone: true,
          }).then(
            () => {
              this.debug('_nextAutoUpdateAlarmDate = ' + alarmDate);
              this._nextAutoUpdateAlarmDate = alarmDate;
            },
            (err) => { this.debug('add alarm failed: ' + err); }
          );
        }
      }
    })
  }

  getData() {
    let self = this;
    this.debug('!!! getData SilentAppInstallManager');
    window.asyncStorage.getItem('silent_uninstalled_apps', (value) => {
      this.uninstalledApps = JSON.parse(value);
    });
    AppsManager.getAll().then((apps) => {
      self.debug('!!! apps length ' + apps.length);
      apps.forEach(function(app) {
        self.debug('!!! app manifestUrl :: ' + app.manifestUrl);
        if (self.installedApps.indexOf(app.manifestUrl) < 0) {
          self.installedApps.push(app.manifestUrl);
        }
      });
    });
  }

  handleOnload(responseText) {
    this.debug('!!!handleOnload' + responseText);
    this.result = JSON.parse(responseText);
    this.result.apps.forEach((app, index) => {
      this.debug('!!! app.silent: ' + app.silent + ' type:' + app.type +
        'manifest' + app.manifest_url);
      if (app.silent) {
        this.silentApps.set(app.manifest_url, app);
        window.asyncStorage.setItem(app.manifest_url, JSON.stringify({
          'version' : null,
          'isSilent' : true
        }));
      }
      if ((index === this.result.apps.length - 1)) {
        if (this.silentApps.size > 0) {
          window.dispatchEvent(new CustomEvent('silent_install'));
        } else {
          this.isAnyFailure = false;
          this.setNextSilentInstallAlarm();
        }
      }
    });
  }

  isAnySilentAlarm() {
    return new Promise((resolve) => {
      if (navigator.b2g && navigator.b2g.alarmManager) {
        navigator.b2g.alarmManager.getAll().then(
          (result) => {
            for (let i = 0; i < result.length; i++) {
              if (result[i].data.type === 'silentInstall') {
                this.debug('isAnySilentAlarm' + result[i].id);
                this._nextAutoUpdateAlarmDate = result[i].date;
                resolve(true);
                return;
              }
            }
            resolve(false);
          },
          () => {
            resolve(false);
          }
        );
      }
    });
  }

  handleOnerror(responseText) {
    this.debug('!!!handleOnerror' + responseText);
    this.setNextSilentInstallAlarm();
  }

  handleOnabort() {
    this.debug('!!!handleOnabort');
    this.setNextSilentInstallAlarm();
  }

  handleOntimeout() {
    this.debug('!!!handleOntimeout');
    this.setNextSilentInstallAlarm();
  }

};
