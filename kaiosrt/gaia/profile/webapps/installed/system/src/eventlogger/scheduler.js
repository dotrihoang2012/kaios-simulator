import * as utils from './utils';

const MILLISECONDS_DAY = 24 * 60 * 60 * 1000;    //24 hours
const MILLISECONDS_ONE_MINUTE = 60 * 1000;

const CHECK_SUMMARY_INTERVAL = MILLISECONDS_DAY;

const EVENTS = ['cell_connected', 'wifi_connected', 'summaryAlarming', 'retryAlarming'];

const LASTALARM = 'evl_last_alarm';
const RETRY_MAX = 6;

var cellTimer = 0;

class Scheduler {
  constructor() {
    this.event_callbacks = {};
    this.wifiManager = navigator.b2g.wifiManager;
    this.conns = navigator.b2g.mobileConnections || [];
    this.summaryInterval = CHECK_SUMMARY_INTERVAL;
    this.alarmTypes = ['EVLCheckSchedule', 'EVLRetry'];
    this.retry = 0;
  }

  start() {
    this.bindOnDatachange = this.onDatachange.bind(this);
    this.bindOnWifihasinternet = this.onWifihasinternet.bind(this);
    this.bindOnTimeChange = this.onTimeChange.bind(this);
    this.bindHandleAlarm = this.handleAlarm.bind(this);
    this.bindScheduleInterval = this.scheduleInterval.bind(this);
    this.bindSetRetryInterval = this.setRetryInterval.bind(this);

    for (var i = 0; i < this.conns.length; i++) {
      this.conns[i].addEventListener('datachange', this.bindOnDatachange);
    }
    if (this.wifiManager) {
      this.wifiManager.addEventListener('wifihasinternet', this.bindOnWifihasinternet);
    }

    window.addEventListener('timechange', this.bindOnTimeChange);
    AlarmMessageHandler.addCallback(this.bindHandleAlarm);

    this.triggerFirstEvent();
    this.newAlarm('EVLCheckSchedule', this.summaryInterval);

    SettingsObserver.observe('evl.schedule.interval', '',
      this.bindScheduleInterval, true);
    SettingsObserver.observe('evl.retry.interval', '',
      this.bindSetRetryInterval, true);
  }

  stop() {
    for (var i = 0; i < this.conns.length; i++) {
      this.conns[i].removeEventListener('datachange', this.bindOnDatachange);
    }
    if (this.wifiManager) {
      this.wifiManager.removeEventListener('wifihasinternet', this.bindOnWifihasinternet);
    }

    window.removeEventListener('timechange', this.bindOnTimeChange);
    this.removeSummaryAlarm();
    AlarmMessageHandler.removeCallback(this.bindHandleAlarm);

    SettingsObserver.unobserve('evl.schedule.interval', this.bindScheduleInterval);
    SettingsObserver.unobserve('evl.retry.interval', this.bindSetRetryInterval);
  }

  onDatachange(e) {
    if (e.target.data.connected) {
      clearTimeout(cellTimer);
      // Remove redundant datachange
      for (var i = 0; i < this.conns.length; i++) {
        if (this.conns[i].data.connected) {
          cellTimer = setTimeout(() => {
            utils.debug('datachange true');
            this.dispatchEvent('cell_connected', { 'detail': { slot: i }, 'type': 'cell_connected' });
          }, 500);
        }
      }
    }
  }

  onWifihasinternet(e) {
    if (e.hasInternet) {
      utils.debug('wifihasinternet true');
      var networkInfo = this.wifiManager.connection.network;
      // It has some gap when the wifi is really connected.
      // Delay the event dispatching
      setTimeout(() => {
        // The 'wifi_connected' means device has internet connection
        this.dispatchEvent('wifi_connected', { 'detail': networkInfo, 'type': 'wifi_connected' });
      }, 1000);
    }
  }

  scheduleInterval(value) {
    var inter = value;
    // Validate, minimum is 60 sec
    if (!isNaN(inter) && inter > 59 * 1000) {
      this.summaryInterval = inter;
      utils.debug('evl.schedule.interval is', this.summaryInterval);
      utils.debug('newAlarm');
      this.newAlarm('EVLCheckSchedule', this.summaryInterval, true);
    }
  }

  setRetryInterval(value) {
    var inter = value;
    // Validate, minimum is 10 sec
    if (!isNaN(inter) && inter > 10 * 1000) {
      this.testTimeInMilli = inter;
      utils.debug('evl.retry.interval is', this.testTimeInMilli);
      this.newAlarm('EVLRetry', this.testTimeInMilli, true);
    } else {
      this.testTimeInMilli = null;
    }
  }

  triggerFirstEvent() {
    for (var i = 0; i < this.conns.length; i++) {
      if (this.conns[i].data.connected) {
        utils.debug('datachange true' + `slot ${i}`);
        this.dispatchEvent('cell_connected', { 'detail': { slot: i }, 'type': 'cell_connected' });
      }
    }

    // Dispatch summaryAlarming if device missed old alarm.
    this.checkAlarm();
  }

  async checkAlarm() {
    var lastAlarmTime = this.lastalarm || await utils.getItem(LASTALARM);
    var time = parseInt(lastAlarmTime);
    utils.debug('checkAlarm lastAlarmTime', time);
    utils.debug('checkAlarm', Date.now());
    if (!isNaN(time) && time < Date.now()) {
      utils.debug('checkAlarm alarming ' + time);
      this.dispatchEvent('summaryAlarming', { 'detail': new Date(time), 'type': 'summaryAlarming' });
    }
  }

  removeSummaryAlarm() {
    return new Promise((resolve, reject) => {
      if (navigator.b2g && navigator.b2g.alarmManager) {
        navigator.b2g.alarmManager.getAll().then(
          (result) => {
            result.forEach((alarm) => {
              if (alarm.data.EVLCheckSchedule) {
                navigator.b2g.alarmManager.remove(alarm.id);
              }
            });
            resolve();
          },
          (err) => {
            reject();
            utils.debug('removeExistingSummaryAlarm failed: ', err);
          }
        );
      }
    })
  }

  addEventListener(key, callback) {
    if (EVENTS.indexOf(key) < 0) {
      return false;
    }
    if (!(key in this.event_callbacks)) {
      this.event_callbacks[key] = [];
    }
    utils.debug('addEventListener scheduler', key);
    this.event_callbacks[key].push(callback);

    return true;
  }

  removeEventListener(key, callback) {
    if (!(key in this.event_callbacks)) {
      return;
    }
    utils.debug('removeEventListener scheduler entering', key);
    var stack = this.event_callbacks[key];
    stack.forEach((element, index) => {
      if (element === callback) {
        utils.debug('removeEventListener scheduler removed', key);
        stack.splice(index, 1);
      }
    });
  }

  dispatchEvent(key, data) {
    var stack = this.event_callbacks[key];
    if (stack === undefined) {
      return;
    }
    stack.forEach((element) => {
      element.call(this, data);
    });
  }

  async onTimeChange() {
    utils.debug('onTimeChange');
    clearTimeout(this.timeChangeTimer);
    this.timeChangeTimer = setTimeout(async () => {
      // Do not touch alarm if there's a valid one.
      var lastAlarmTime = this.lastalarm || await utils.getItem(LASTALARM);
      var diff = lastAlarmTime ? lastAlarmTime - Date.now() : 0;
      if (diff > 0 &&  diff < this.summaryInterval) {
        return;
      }

      this.newAlarm('EVLCheckSchedule', this.summaryInterval, true);
      if (this.retryRunning) {
        this.newAlarm('EVLRetry', this.getRetryInterval(this.retry), true);
      }
    }, 5000);
  }

  handleAlarm(alarm) {
    if (alarm.data.EVLCheckSchedule) {
      if ((this.lastAlarmDate && this.lastAlarmDate.getTime()) === new Date(alarm.date).getTime()) {
        utils.debug('duplicate alarm, rejected');
        return;
      }

      //Re-schedule same alarm
      this.newAlarm('EVLCheckSchedule', this.summaryInterval);

      // Do no trigger alarm while setting system time in one minute
      if (!this.lastAlarmRelativeTime ||
        (performance.now() - this.lastAlarmRelativeTime > MILLISECONDS_ONE_MINUTE)) {
        utils.debug('EVL alarming');
        this.lastAlarmRelativeTime = performance.now();
        this.lastAlarmDate = alarm.date;
        this.dispatchEvent('summaryAlarming', { 'detail': alarm.date, 'type': 'summaryAlarming' });
      }
    } else if (alarm.data.EVLRetry) {
      // User may stop the alarm after the next round has been set up.
      // Stop dsipatching here.
      if (!this.retryRunning) {
        this.retry = 0;
        return;
      }
      if ((this.lastRetryAlarmDate && this.lastRetryAlarmDate.getTime()) === new Date(alarm.date).getTime()) {
        utils.debug('duplicate alarm, rejected');
        return;
      }
      utils.debug('EVL retryAlarming alarming');
      this.lastRetryAlarmDate = new Date(alarm.date);
      if (this.needStopRetry()) {
        this.dispatchEvent('retryAlarming', { detail: alarm, keys: this.retryPkeys, data: this.retryData, stopped: true });
        this.removeRetryAlarm();
      } else {
        this.retry += 1;
        this.dispatchEvent('retryAlarming', { detail: alarm, keys: this.retryPkeys, data: this.retryData, stopped: false });
        //Re-schedule same alarm
        this.newAlarm('EVLRetry', this.getRetryInterval(this.retry));
      }
    }
  }

  newAlarm(type, interval, forceNew) {
    if (navigator.b2g && navigator.b2g.alarmManager) {
      navigator.b2g.alarmManager.getAll().then(
        (result) => {
          utils.debug('EVL newAlarm = ' + JSON.stringify(result));
          let alarmFound = false;
          result.forEach((alarm) => {
            // Only one alarm allowed.
            if (alarm.data[type]) {
              if (forceNew || alarmFound) {
                navigator.b2g.alarmManager.remove(alarm.id);
              } else if (new Date(alarm.date).getTime() > Date.now()) {
                alarmFound = true;
                this.nextAlarmDate = new Date(alarm.date);
              }
            }
          });
          if (!alarmFound) {
            this.addAlarm(interval, type);
          }
        },
        (err) => {
          utils.debug('newAlarm failed: ', err);
        }
      );
    }
  }

  needStopRetry() {
    return this.retry > RETRY_MAX - 1;
  }

  newRetryAlarm(data, pKeys) {
    this.newAlarm('EVLRetry', this.getRetryInterval(this.retry));
    this.retryData = data;
    this.retryPkeys = pKeys;
    this.retryRunning = true;
  }

  removeRetryAlarm() {
    this.retry = 0;
    this.retryData = null;
    this.retryPkeys = null;
    this.retryRunning = false;
    if (navigator.b2g && navigator.b2g.alarmManager) {
      navigator.b2g.alarmManager.getAll().then(
        (result) => {
          utils.debug('removeRetryAlarm[]=' + JSON.stringify(result));
          result.forEach((alarm) => {
            if (alarm.data.EVLRetry) {
              navigator.b2g.alarmManager.remove(alarm.id);
            }
          });
        },
        (err) => {
          utils.debug('operation failed: ', err);
        }
      );
    }
  }

  getRetryInterval(n) {
    if (this.testTimeInMilli) {
      return this.testTimeInMilli;
    }

    var ret = 60 * 60 * 1000;
    switch (n) {
      case 0:
        ret = 60 * 1000;
        break;
      case 1:
        ret = 5 * 60 * 1000;
        break;
      case 2:
        ret = 30 * 60 * 1000;
        break;
      case 3:
        ret = 60 * 60 * 1000;
        break;
    }

    return ret;
  }

  addAlarm(interval, type) {
    const alarmDate = new Date(Date.now() + interval);
    if (navigator.b2g && navigator.b2g.alarmManager) {
      navigator.b2g.alarmManager.add({
        date: alarmDate,
        data: { [type]: true },
        ignoreTimezone: true,
      }).then(
        () => {
          this.nextAlarmDate = alarmDate;
          utils.debug('nextAlarmDate=' + alarmDate, type);
          if (type === 'EVLCheckSchedule') {
            this.lastalarm = alarmDate.getTime();
            utils.setItem(LASTALARM, this.lastalarm)
            utils.debug('addAlarm LASTALARM set ' + this.lastalarm);
          }
        },
        (err) => { utils.debug('add alarm failed: ' + err); }
      );
    }
  }

  hasWifiConnection() {
    if (this.wifiManager && this.wifiManager.connection.network &&
      this.wifiManager.connection.network.hasInternet) {
      return true;
    }

    return false;
  }
}

export default Scheduler;
