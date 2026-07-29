/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global FxAccountsUI, FxAccountsClient,
   AlarmMessageHandler, SettingsObserver, WebActivity */

'use strict';

var FxAccountsManager = {
  DEBUG: false,
  ONEDAY: 24 * 60 * 60 * 1000,

  _debug: function(msg) {
    if (this.DEBUG) {
      console.log(msg);
    }
  },

  init: function fxa_mgmt_init() {
    // Listen for platform OTP received event.
    window.addEventListener('otpReceived', this.onOTPReceived.bind(this));
    window.addEventListener('otpSmsReceived', this.onOTPSmsReceived.bind(this));
    // When time changed, we need to fresh check password check time
    window.addEventListener('timechange', this.onTimeChange.bind(this));

    AlarmMessageHandler.addCallback(this.handleAlarm.bind(this));
    // To init nextAlarmDate Only if we have an alarm.
    this.checkAndNewAlarm();

    this.labelVersion();

    // Check and show notice 30 seconds after booting up.
    setTimeout(this.checkAccountAndShowNotification.bind(this), 30000);
  },

  checkUpdatePhone: function(phone) {
    let changed = false;
    if (!phone) {
      return changed;
    }

    function loadPhoneNumber() {
      let phoneNumbers = [];
      let _conns = navigator.b2g.mobileConnections;
      if (!_conns) {
        return phoneNumbers;
      }

      let phoneNumber = null;

      Array.prototype.forEach.call(_conns, conn => {
        let iccId = conn.iccId;
        if (!iccId) {
          return;
        }
        let iccManager = navigator.b2g.iccManager;
        if (!iccManager) {
          return;
        }

        let iccObj = iccManager.getIccById(iccId);
        if (!iccObj) {
          return;
        }

        let iccInfo = iccObj.iccInfo;
        if (!iccInfo) {
          return;
        }

        phoneNumber = iccInfo.msisdn || iccInfo.mdn;
        if (phoneNumber) {
          if (phoneNumber.indexOf('+') !== 0) {
            phoneNumber = '+' + phoneNumber;
          }
          phoneNumbers.push(phoneNumber);
        }
      });

      return phoneNumbers;
    }
    let phoneNumbers = loadPhoneNumber();
    if (phoneNumbers.length > 0 && phoneNumbers.indexOf(phone) === -1) {
      changed = true;
    }

    return changed;
  },

  showUpdateHint: function() {
    let _ = window.api.l10n.get;
    let title = _('phone-number-changed-title') || '' ;
    let body = _('phone-number-changed-body') || '' ;

    let options = {
      body: body,
      mozbehavior: {
        noclear: true
      },
      icon: 'contacts',
      tag: 'account_phone_number_mismatch',
    };
    const notification = new Notification(title, options);
    notification.onclick = () => {
      notification.close();
      const activity = new WebActivity('configure', {
        target: 'device',
        section: 'kaios_account_login',
      });
      activity.start();
    }
  },

  checkAccountAndShowNotification: function() {
    if (!FxAccountsClient) {
      return;
    }
    FxAccountsClient.getAccounts((data) => {
      if(data.phone && this.checkUpdatePhone(data.phone)) {
        this.showUpdateHint();
      }
    }, () => {});
  },

  labelVersion: function() {
    var key = 'kaiaccount.version';
    var version = '3.0.0';
    SettingsObserver.getValue(key).then((value) => {
      if (value !== version) {
        SettingsObserver.setValue([{
          name: key,
          value: version
        }]);
      }
    });
  },

  initNewAlarm: function() {
    this.checkAndNewAlarm(this.nextDate(), true);
    this.showNotification();
  },

  // If both alarmDate and forceNew are null,
  // We just want try to init nextAlarmDate
  checkAndNewAlarm: function(alarmDate, forceNew) {
    if (navigator.b2g && navigator.b2g.alarmManager) {
      navigator.b2g.alarmManager.getAll().then(
        (result) => {
          let alarmFound = false;
          result.forEach((alarm) => {
            // Only one alarm allowed.
            if (alarm.data.accountNeedVerify) {
              if (forceNew || alarmFound) {
                this._debug('checkAndNewAlarm remove');
                navigator.b2g.alarmManager.remove(alarm.id);
                this.nextAlarmDate = null;
              } else if (alarm.date.getTime() > Date.now()) {
                alarmFound = true;
                this.nextAlarmDate = alarm.date;
              }
            }
          });
          if (!alarmFound && alarmDate) {
            this.addAlarm(alarmDate);
          }
        },
        (err) => {
          this._debug('newAlarm failed: ' + err);
        }
      );
    }
  },

  nextDate: function() {
    var now = new Date();
    var alarmDate = new Date();
    // 9:00:00'00 am
    alarmDate.setHours(9, 0, 0, 0);
    if (now.getTime() > alarmDate.getTime()) {
      // 9am tomorrow
      alarmDate = new Date(alarmDate.getTime() + this.ONEDAY);
    }

    return alarmDate;
  },

  addAlarm: function(alarmDate = this.nextDate()) {
    if (navigator.b2g && navigator.b2g.alarmManager) {
      navigator.b2g.alarmManager.add({
        date: alarmDate,
        data: { accountNeedVerify: true },
        ignoreTimezone: true,
      }).then(
        () => { this.nextAlarmDate = alarmDate; },
        (err) => { this._debug('add alarm failed: ' + err); }
      );
    }
  },

  disableAlarm: function() {
    if (navigator.b2g && navigator.b2g.alarmManager) {
      navigator.b2g.alarmManager.getAll().then(
        (result) => {
          result.forEach((alarm) => {
            if (alarm.data.accountNeedVerify) {
              navigator.b2g.alarmManager.remove(alarm.id);
              this.nextAlarmDate = null;
            }
          });
        }
      );
    }

    this.notification && this.notification.close();
  },

  onTimeChange: function() {
    this.refreshAlarm();
    this.refreshCheckPassWordTime();
  },

  refreshAlarm: function() {
    if (!this.nextAlarmDate) {
      this._debug('refreshAlarm nextAlarmDate is null return');
      return;
    }
    if (this.nextAlarmDate.getTime() - Date.now() < this.ONEDAY) {
      return;
    }
    this._debug('refreshAlarm initNewAlarm');
    this.initNewAlarm();
  },

  handleAlarm: function(alarm) {
    if (!alarm.data.accountNeedVerify) {
      return;
    }

    if ((this.lastAlarmDate && this.lastAlarmDate.getTime()) === new Date(alarm.date).getTime()) {
      this._debug('duplicate alarm, rejected');
      return;
    }

    this.showNotification();

    this._debug('account alarming');
    this.lastAlarmDate = alarm.date;

    this.addAlarm(this.nextDate());
  },

  showNotification: function() {
    var _ = window.api.l10n.get;
    var notifOptions = {
      body: _('kaios-verify-number'),
      icon: 'contacts',
      tag: 'kaios-account-altphone'
    };

    this.notification = new Notification(_('kaios-account'), notifOptions);
    this.notification.addEventListener('click', () => {
      this.notification.close();
      const activity = new WebActivity('configure', {
        target: 'device',
        section: 'kaios_account_login',
      });
      activity.start();
    });
  },

  refreshCheckPassWordTime: function() {
    // Per spec SFP_IxD_Spec_Account & Anti-theft_v2.5
    var _retryInterval = {
      6: 1 * 60 * 1000,
      7: 5 * 60 * 1000,
      8: 15 * 60 * 1000,
      9: 60 * 60 * 1000,
      10 : 4 * 60 * 60 * 1000
    };

    window.asyncStorage.getItem('checkpassword.retrycount', count => {
      this._debug('checkpassword.retrycount is ' + count);
      if (count >= 6) {
        if (count >= 10) {
          count = 10;
        }
        var interval = _retryInterval[count];
        var enableTime = (new Date()).getTime() + interval;
        this._debug('Next password retry should be later than ' + enableTime);
        window.asyncStorage.setItem('checkpassword.enabletime', enableTime);
      }
    })
    this._debug('initRefreshChkPwd when timechange');
  },

  onOTPReceived: function (event) {
    this._debug('--> onOTPReceived(): event = ' + event);
    FxAccountsUI.fillInOTP(event.detail);
  },

  onOTPSmsReceived: function (event) {
    this._debug('--> onOTPSmsReceived(): event = ' + event);
    FxAccountsUI.showOTPSms(event.detail);
  }
};

FxAccountsManager.init();
