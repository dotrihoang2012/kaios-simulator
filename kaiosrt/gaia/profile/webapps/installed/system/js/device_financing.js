/* (c) 2017 KAI OS TECHNOLOGIES (HONG KONG) LIMITED All rights reserved. This
 * file or any portion thereof may not be reproduced or used in any manner
 * whatsoever without the express written permission of KAI OS TECHNOLOGIES
 * (HONG KONG) LIMITED. KaiOS is the trademark of KAI OS TECHNOLOGIES (HONG KONG)
 * LIMITED or its affiliate company and may be registered in some jurisdictions.
 * All other trademarks are the property of their respective owners.
 */

/* global Service, AlarmMessageHandler, InitLogoHandler
   WebActivity */
'use strict';
/* Level:
 *  'normal',
 *  'due-remind', // 1~3 Days Before Due Date, notification
 *  'due-today',  // due today, notification
 *  'overdue-level1', // 1~6 Days overdue, prompt
 *  'overdue-level2', // 7~13 Days overdue, prompt and restrict app
 *  'overdue-level3-lock', // lock device, modem can work
 *  'overdue-level1-no-internet', // ???
 *  'overdue-modem-lock', // lock device, modem lock
 *  'inactivation-lock', // device lock, modem lock
 *  'unlocked-permanently'
 */

(function(exports) {

  var DeviceFinancingStore = function() {};
  DeviceFinancingStore.prototype = {
    DEBUG: false,
    name: 'DeviceFinancingStore',
    appList: [
      window.AppOrigin.getManifestURL('sms'),
      window.AppOrigin.getManifestURL('camera'),
      'https://api.kaiostech.com/apps/manifest/oRD8oeYmeYg4fLIwkQPH', // facebook
      'https://api.kaiostech.com/apps/manifest/6x6P4Ap7oCIzOW10hBpm', // youtube
      'https://api.kaiostech.com/apps/manifest/ahLsl7Qj6mqlNCaEdKXv' // whatsapp
    ],
    homescreenstatus: ['mainView', 'sidemenu'],
    info: {
      level: 'unlock'
    },
    homescreenHash: 'mainView',
    offlineDays: -1,
    lastUpdateTime: 0,
    lastNextLevelOffset: 0,
    start: function() {
      Service.register('launchMyMoBill', this);
      Service.register('showDueNotice', this);
      Service.registerState('promptRestrictedAppDialog', this);
      Service.registerState('isDeviceLocked', this);
      if (Service.query('supportDFC')) {
        this.init();
      }
    },

    init: function() {
      window.asyncStorage.getItem('device-financing-offlineDays', (value) => {
        const offlineDays = value;
        if (offlineDays) {
          this.offlineDays = offlineDays;
        }
        Service.request('handleSystemMessageNotification',
          'device-financing-notice', this);
        this.deviceFinancingEnabled = true;
        this.financing = navigator.dfc;
        this.getDeviceFinancingInfo();
        this.resetAlarm();
        window.addEventListener('homescreenlocationchange', this);
        window.addEventListener('hierarchytopmostwindowchanged', this);
        window.addEventListener('hierarchychanged', this);
        window.addEventListener('timechange', this);
        window.addEventListener('ftudone', this);
        window.addEventListener('logohidden', this);
        AlarmMessageHandler.addCallback(this.updateInfo.bind(this));
        this.financing.addEventListener('configChanged', this);
      });
    },

    debug: function() {
      window.DUMP('[' + this.name + ']' +
        '[' + Service.currentTime() + '] ' +
        Array.prototype.slice.call(arguments).concat());
    },

    updateInfo: function(message) {
      if (message.data && message.data.isDeviceFinancing) {
        this.debug('AlarmMessageHandler callback');
        this.getDeviceFinancingInfo();
        this.resetAlarm();
      }
    },

    showPrompt: function() {
      const { level } = this.info;
      this.debug('showPrompt ' + level);
      if (!this.promptShow &&
        (level === 'overdue-level1' || level === 'overdue-level2')) {
        this.promptShow = true;
        Service.request('Prompt:show', {
          icon: 'style/icons/myMoBIll_56.png',
          title: window.api.l10n.get('df-overdue-prompt'),
          appName: 'MyMoBill'
        });
      }
    },

    hidePrompt: function() {
      if (this.promptShow) {
        this.promptShow = false;
        Service.request('Prompt:hide');
      }
    },

    handleSystemMessageNotification: function(message) {
      this.closeSystemMessageNotification(message);
      if (message.data.dueDay === undefined) {
        this.ShowOfflineDialog();
      } else {
        this.ShowDueDialogAndLaunchApp(message.data.dueDay);
      }
    },

    closeSystemMessageNotification: function(msg) {
      Service.request('removeSystemNoticeByTag', msg.tag, true);
    },

    isDeviceLocked: function() {
      if (this.info.level && this.info.level.endsWith('-lock')) {
        return this.info.level;
      }
      return false;
    },

    launchMyMoBill: function(secureLaunch) {
      this.debug('launch MyMoBill');
      if (this.deviceFinancingEnabled) {
        let url = window.parent.location.href.replace('system', 'mymobill');
        const manifestUrl =
          url.replace(
            /(\/)*(index.html#?)*$/, `/${window.AppOrigin.getManifestName()}`
          );
        if (secureLaunch) {
          url += '#secure';
          window.dispatchEvent(new window.CustomEvent('secure-launchapp', {
            'detail': {
              'appURL': url,
              'appManifestUrl': manifestUrl
            }
          }));
        } else {
          window.AppsManager.launch(manifestUrl);
        }
      }
    },

    showDueNotice: function(dueDay) {
      this.debug('showDueNotice ' + dueDay);
      const _ = window.api.l10n.get;
      window.NotificationService.send(_('df-mymobill'), {
        body: _('df-days-due-notice-content', {n: dueDay}),
        icon: 'style/icons/myMoBIll_56.png',
        tag: 'device-financing-notice' + (new Date().getTime()),
        data: {
          dueDay: dueDay,
          systemMessageTarget: 'device-financing-notice'
        }
      });
    },

    ShowDueDialogAndLaunchApp: function(dueDay) {
      const _ = window.api.l10n.get;
      Service.request('DialogService:show', {
        id: 'device-financing-due-reminder',
        header: 'MyMoBill',
        content: _('df-days-due-dialog-content', { n: dueDay }),
        ok: 'ok',
        type: 'alert',
        translated: true,
        noClose: true,
        onOk: () => {
          Service.request('DialogService:hide', 'device-financing-due-reminder');
        }
      });
      this.launchMyMoBill();
    },

    convertInfo: function(info) {
      // Level: -1:unkown, 0:normal, 1:remind, 2:due, 3: warn, 4:overdue1, 5: overdue2, 6: lock
      // state: 0: UNCONFIGURED, 1: CONFIGURED, 2:  DEACTIVATED,
      const { level, state, nextLevelOffset, lastUpdate } = info;
      const levelMapping = {
        '-1': 'normal',
        0: 'normal',
        1: 'due-remind',
        2: 'due-today',
        3: 'overdue-level1',
        4: 'overdue-level2',
        5: 'overdue-level3-lock',
        6: 'overdue-modem-lock'
      };
      let newInfo = {};
      this.debug('convertInfo level: ' + level + ' state: ' + state +
        ' nextLevelOffset: ' + nextLevelOffset);
      if (state === 2) {
        newInfo.level = 'unlocked-permanently';
      } else if (state === 0) {
        if (level === 6) {
          newInfo.level = 'inactivation-lock';
        } else {
          newInfo.level = 'normal';
        }
      } else {
        newInfo.level = levelMapping[level];
        newInfo.leftDays = Math.min(Math.floor(nextLevelOffset / 86400) + 1, 3);
        if (newInfo.level === 'due-today') {
          newInfo.leftDays = 0;
        }
      }
      if (info.appList && info.appList.length) {
        this.debug('info.appList update ' + info.appList.length);
        newInfo.appList = info.appList;
      }

      newInfo.lastUpdate = lastUpdate;
      newInfo.nextLevelOffset = nextLevelOffset;
      return newInfo;
    },

    getDeviceFinancingInfo: function() {
      this.debug('getDeviceFinancingInfo');
      return new Promise((resolve) => {
        this.financing.get().then((newInfo) => {
          this.lastLevel = this.info.level;
          this.info = this.convertInfo(newInfo);
          const { info } = this;
          this.checkOfflineDays();
          if (this.lastLevel !== info.level) {
            this.DueDayCheck();
            this.checkWhetherShowPrompt();
            window.dispatchEvent(new CustomEvent('device-lock-state-update'));
          }
          this.debug('getDeviceFinancingInfo new level ' + info.level);
          resolve();
        }, () => {
          this.debug('financing get error.');
          resolve();
        });
      });
    },

    checkOfflineDays: function() {
      this.debug('checkOfflineDays ' + this.info.lastUpdate + ' ' +
        this.lastUpdateTime);
      let offlineDays = 0;
      if (this.info.level === 'overdue-level1') {
        if (this.info.lastUpdate === this.lastUpdateTime) {
          const offlineHours = (this.lastNextLevelOffset - this.info.nextLevelOffset) / 3600;
          offlineDays = offlineHours / 24;
          offlineDays = Math.floor(offlineDays);
          if ((this.offlineDays === -1 && offlineHours > 4) ||
            (this.offlineDays !== -1 && this.offlineDays !== offlineDays)) {
            this.showOfflineWarningNotice();
          }
          if (offlineHours > 4) {
            this.offlineDays = offlineDays;
          }
        } else {
          this.lastNextLevelOffset = this.info.nextLevelOffset;
        }
        this.lastUpdateTime = this.info.lastUpdate;
      } else {
        this.offlineDays = -1;
      }
      this.debug('checkOfflineDays new offlineDays ' + this.offlineDays);
      try {
        window.asyncStorage.setItem('device-financing-offlineDays', offlineDays);
      } catch (e) {
        console.error('Device financing: Data is full');
      }
    },

    ShowOfflineDialog: function() {
      Service.request('DialogService:show', {
        id: 'device-financing-warning',
        header: 'df-mymobill',
        content: 'df-offline-warning-content',
        type: 'custom',
        noClose: true,
        onBack: () => {
          Service.request('DialogService:hide', 'device-financing-warning');
        },
        onOk: (value) => {
          switch(value.selectedButton) {
            case 2:
              var activity = new WebActivity('configure', {
                target: 'device',
                section: 'connectivity-settings'
              });
              activity.start();
              Service.request('DialogService:hide', 'device-financing-warning');
              break;
            default:
              break;
          }
        },
        buttons: [
          { message: '' }, { message: '' }, { message: 'settings' }
        ]
      });
    },

    showOfflineWarningNotice: function() {
      this.debug('showOfflineWarningNotice');
      const _ = window.api.l10n.get;
      window.NotificationService.send(_('df-mymobill'), {
        body: _('df-offline-warning-content'),
        icon: 'style/icons/myMoBIll_56.png',
        tag: 'device-financing-notice' + (new Date().getTime()),
        data: {
          systemMessageTarget: 'device-financing-notice'
        }
      });
    },

    isRestrictedApp: function(config) {
      if (this.deviceFinancingEnabled) {
        const appList = this.info.appList || this.appList;
        return appList.includes(config.manifestUrl);
      } else {
        return false;
      }
    },

    promptRestrictedAppDialog: function(config) {
      if (this.info.level === 'overdue-level2' &&
        this.isRestrictedApp(config)) {
        Service.request('DialogService:show', {
          id: 'device-financing-warning',
          header: 'df-restricted-app-title',
          content: 'df-restricted-app-content',
          type: 'custom',
          noClose: true,
          onBack: () => {
            Service.request('DialogService:hide', 'device-financing-warning');
          },
          onOk: (value) => {
            switch(value.selectedButton) {
              case 1:
                Service.request('DialogService:hide', 'device-financing-warning');
                break;
              case 2:
                this.launchMyMoBill();
                Service.request('DialogService:hide', 'device-financing-warning');
                break;
              default:
                break;
            }
          },
          buttons: [
            { message: '' }, { message: 'ok' }, { message: 'df-mymobill' }
          ]
        });
        return true;
      }
      return false;
    },

    DueDayCheck: function() {
      if (this.info.level === 'due-remind' || this.info.level === 'due-today') {
        this.showDueNotice(this.info.leftDays);
      }
    },

    checkWhetherShowPrompt: function() {
      const topMostWindow = Service.query('getTopMostWindow');
      if (InitLogoHandler.finished &&
        topMostWindow && topMostWindow.isHomescreen &&
        this.homescreenstatus.includes(this.homescreenHash)) {
        this.showPrompt();
      } else {
        this.hidePrompt();
      }
    },

    handleEvent: function(evt) {
      this.debug('handleEvent ' + evt.type);
      switch (evt.type) {
        case 'test-device-financing-update':
          this.testConfigChangeHandler(evt);
          break;
        case 'configChanged':
          this.configChangedHandler();
          break;
        case 'logohidden':
          this.checkWhetherShowPrompt();
          break;
        case 'hierarchychanged':
          this.hierarchychangedHandler();
          break;
        case 'hierarchytopmostwindowchanged':
          this.hierarchytopmostwindowchangedHandler();
          break;
        case 'homescreenlocationchange':
          this.homescreenlocationchangeHandler(evt);
          break;
        case 'timechange':
          this.resetAlarm();
          break;
        case 'ftudone':
          this.launchMyMoBill();
          break;
        default:
          break;
      }
    },

    testConfigChangeHandler: function(evt) {
      this.debug('now level is: ' + evt.detail.level);
      this.info.level = evt.detail.level;
      window.dispatchEvent(new CustomEvent('device-lock-state-update'));
    },

    configChangedHandler: function() {
      this.getDeviceFinancingInfo();
    },

    hierarchychangedHandler: function() {
      if (Service.query('getTopMostUI').name === 'AppWindowManager') {
        this.checkWhetherShowPrompt();
      } else {
        this.hidePrompt();
      }
    },

    hierarchytopmostwindowchangedHandler: function() {
      this.checkWhetherShowPrompt();
    },

    homescreenlocationchangeHandler: function(evt) {
      const homescreenAppWindow = evt.detail;
      const homescreenUrl = homescreenAppWindow.browser.element.dataset.url;
      if (homescreenUrl && homescreenUrl.indexOf('#') >= 0) {
        this.homescreenHash = homescreenUrl.split('#')[1];
        this.checkWhetherShowPrompt();
      }
    },

    setNewAlarm: function(timeStamp) {
      this.debug('Add alarms ' + timeStamp);
      if (navigator.b2g && navigator.b2g.alarmManager) {
        navigator.b2g.alarmManager.add({
          date: new Date(timeStamp),
          ignoreTimezone: true,
          data: { isDeviceFinancing: true }
        });
      }
    },

    resetAlarm: function() {
      this.debug('resetAlarm');
      const curTimestamp = new Date().getTime();
      const ALARM_INTERVAL = 14400000; // Four hours
      const nextAlarmStamp = curTimestamp + ALARM_INTERVAL;
      if (navigator.b2g && navigator.b2g.alarmManager) {
        navigator.b2g.alarmManager.getAll().then((result) => {
          const findAlarm = result.find((alarm) => {
            return !!alarm.data.isDeviceFinancing;
          });
          if (findAlarm) {
            const alarmTimestamp = findAlarm.date.getTime();
            if (curTimestamp > alarmTimestamp ||
              alarmTimestamp - curTimestamp > ALARM_INTERVAL) {
              if (navigator.b2g && navigator.b2g.alarmManager) {
                navigator.b2g.alarmManager.remove(findAlarm.id);
              }
              this.setNewAlarm(nextAlarmStamp);
            }
          } else {
            this.setNewAlarm(nextAlarmStamp);
          }
        });
      }
    }
  }
  exports.DeviceFinancingStore = DeviceFinancingStore;
}(window));
