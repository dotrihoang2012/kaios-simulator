/* global AlarmMessageHandler, FxAccountsClient, DUMP, WebActivity
  asyncStorage, AccountManagerDBHelper*/
'use strict';
(function(exports) {
  var AntitheftAlarmManager = {
    timeSpan: 60 * 24 * 60 * 1000,
    lastRefreshTime: 0,
    loggedIn: false,
    refreshTimeKey: 'kaiaccount_token_refresh',
    
    showNotification: function() {
      var _ = window.api.l10n.get;
      var notifyOptions = {
        body: _('kaios-account-force-signout'),
        icon: 'contacts',
        tag: 'kaios-account-force-signout'
      };

      this.notification = new Notification(_('kaios-account'), notifyOptions);
      this.notification.addEventListener('click', () => {
        this.notification.close();
        const activity = new WebActivity('configure', {
          target: 'device',
          section: 'kaios_account',
        });
        activity.start();
      });
    },

    refresh: function() {
      if (!this.loggedIn) {
        console.error('Kai Account not logged in. Skip refresh');
        return;
      }

      this.createAlarms(true);

      if (!window.isOnline()) {
        // Wait for next round or online
        return;
      }
      DUMP('refresh AntitheftAlarmManager');

      this.lastRefreshTime = Date.now();
      asyncStorage.setItem(this.refreshTimeKey, this.lastRefreshTime);

      FxAccountsClient.refreshToken().then(
        () => {}, 
        (err) => {
          if (err.error == 'INVALID_AUTH_TOKEN') {
            // Failed to sign out show notification
            this.showNotification();
          }
        }
      );
    },

    init: function() {
      DUMP('init AntitheftAlarmManager');
      window.addEventListener('kaiaccount:onlogin', () => {
        this.loggedIn = true;
        this.createAlarms(true);
      });

      window.addEventListener('kaiaccount:onlogout', () => {
        this.loggedIn = false;
        this.removeAlarms();
      });

      const conns = navigator.b2g.mobileConnections || [];
      for (let i = 0; i < conns.length; i++) {
        conns[i].addEventListener('datachange', this.tryKaiAccountTokenRefresh.bind(this));
      }

      const wifiManager = navigator.b2g.wifiManager;
      if (wifiManager) {
        wifiManager.addEventListener('wifihasinternet', () => {
          if (wifiManager.connection.status === 'connected') {
            this.tryKaiAccountTokenRefresh();
          }
        });
      }

      AlarmMessageHandler.addCallback(this.handleAlarm.bind(this));

      asyncStorage.getItem(this.refreshTimeKey, data => {
        if (data) {
          this.lastRefreshTime = data;
        }
      });

      AccountManagerDBHelper.get({authenticatorId: 'kaiaccount'},
        account => {
          if (account) {
            this.loggedIn = true;
            this.createAlarms();
          }
        }
      );
    },

    handleAlarm: function(message) {
      if (message.data && message.data.kaiAccountTokenRefresh) {
        DUMP('handleAlarm');
        this.refresh();
      }
    },

    tryKaiAccountTokenRefresh: function() {
      DUMP(`tryKaiAccountTokenRefresh ${this.lastRefreshTime} ${this.timeSpan}`);
      if (Date.now() - this.lastRefreshTime > this.timeSpan) {
        this.refresh();
      }
    },
    
    createAlarms: async function(forceNew = false) {
      DUMP(`createAlarms forceNew ${forceNew}`);
      if (navigator.b2g && navigator.b2g.alarmManager) {
        const result = await navigator.b2g.alarmManager.getAll();
        let alarmFound = false;
        result.forEach((alarm) => {
          // Only one alarm allowed. In case of more than one alarms,
          // If forceNew is true, remove all the alarms and create new.
          // If one alarm is found, we remove rest ones.
          if (alarm.data.kaiAccountTokenRefresh) {
            if (forceNew || alarmFound) {
              DUMP('remove kaiAccountTokenRefresh');
              navigator.b2g.alarmManager.remove(alarm.id);
            } else if (new Date(alarm.date).getTime() > Date.now()) {
              alarmFound = true;
              DUMP('alarmFound true ');
              DUMP(`alarm date ${new Date(alarm.date).getTime()}`);
            }
          }
        });
        if (!alarmFound) {
          await navigator.b2g.alarmManager.add({
            date: new Date(Date.now() + this.timeSpan),
            data: {kaiAccountTokenRefresh: true},
            ignoreTimezone: true,
          });
        }
        
        DUMP('kaiAccountTokenRefresh created');
      }
    },

    removeAlarms: async function() {
      if (navigator.b2g && navigator.b2g.alarmManager) {
        const result = await navigator.b2g.alarmManager.getAll();
        result.forEach((alarm) => {
          if (alarm.data.kaiAccountTokenRefresh) {
            navigator.b2g.alarmManager.remove(alarm.id);
          }
        });
        this.lastRefreshTime = 0;
        asyncStorage.setItem(this.refreshTimeKey, 0);
      }
    }

  }
  exports.AntitheftAlarmManager = AntitheftAlarmManager;
}(window));

window.AntitheftAlarmManager.init();
