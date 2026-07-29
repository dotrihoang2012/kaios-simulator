/* global AlarmMessageHandler, lib_settings, lib_fota, WebActivity, Service, FtuLauncher */
'use strict';

const SCOPE_FOTA = '/js/fota';

var FotaAgent = {
  debug(info, error) {
    let logger = error ? console.error : console.log;
    logger('fota_next_agent.js: ' + info);
  },

  _FOTA_SERVICE_URL: 'http://127.0.0.1/api/v1/fota/service.js',
  _TRIGGER: undefined,
  _ready: false,
  _fota: null,
  _fotaData: null,
  _fotaState: null,
  _fotaError: {
    checking: null,
    downloading: null,
    installing: null,
  },
  _alarm: {
    check: {
      missed: false,
      date: null,
      tag: 'isFotaCheckAlarm',
      cb: () => FotaAgent.onCheckAlarm(),
    },
    install: {
      missed: false,
      date: null,
      tag: 'isFotaInstallAlarm',
      cb: () => FotaAgent.onInstallAlarm(),
    },
  },
  _settings: new Map([
    [
      'primaryCardId',
      { key: 'ril.data.defaultServiceId', inited: false, value: 0, default: 0 },
    ],
    [
      'whiteList',
      {
        key: 'ril.data.mobileWhiteList',
        inited: false,
        value: [],
        default: [],
      },
    ],
  ]),
  _context: {},

  onAlarm(alarm) {
    this.debug(`onAlarm, alarm=${JSON.stringify(alarm)}`);
    if (!alarm.data || !alarm.date) {
      return; // Invalid alarm
    }
    // Iterate _alarm to see if we have proper function to call
    for (const key in this._alarm) {
      let alarmProp = this._alarm[key];
      if (alarm.data[alarmProp.tag]) {
        // Note: duplicate check seems no need now, so we removed that
        // The date here is for debug only, and it is NOT a "Date" type
        this._alarm[key].date = alarm.date;
        // Execute alarm callback immediately when ready, else mark it as missed
        if (this._ready) {
          // We could execute
          this._alarm[key].missed = false;
          alarmProp.cb();
        } else {
          this._alarm[key].missed = true;
          this.debug(
            `onAlarm() received ${key} alarm as fota not ready, set as missed`
          );
        }
        return;
      }
    }
  },

  onCheckAlarm(push) {
    this.debug('onCheckAlarm');
    if (!this._ready) {
      this.debug('onCheckAlarm(), FotaAgent NOT ready, set as missed');
      this._alarm.check.missed = true;
      return;
    }
    let fota = this._fota;
    let trigger = push ? lib_fota.Trigger.PUSH : this._TRIGGER;
    fota.check(true, trigger, this.getNetwork());
  },

  onInstallAlarm() {
    this.debug('onInstallAlarm');
    if (!this._ready) {
      this.debug('onInstallAlarm(), FotaAgent NOT ready, set as missed');
      this._alarm.install.missed = true;
      return;
    }
    if (this.isDownloadFinished()) {
      this.prepareInstall();
    }
  },

  async setAlarm(alarmType, interval, forceClear) {
    this.debug(
      `setAlarm(), type=${alarmType}, intv=${interval}, forceClr=${forceClear}`
    );
    if (!this._alarm[alarmType]) {
      this.debug(`setAlarm(), unknown alarmType=${alarmType}`);
      return;
    }
    let allAlarms = await navigator.b2g.alarmManager.getAll();
    this.debug(
      `setAlarm(), getAll() executed, allAlarms=${JSON.stringify(
        allAlarms,
        null,
        2
      )}`
    );
    let found = false;
    let hold = false;
    let expected = new Date().getTime() + interval * 1000; // Expected time
    for (const alarm of allAlarms) {
      if (alarm.data[this._alarm[alarmType].tag]) {
        if (!found) {
          // 1st matched alarm found
          found = true;
          this.debug(
            `setAlarm(), found alarm, data=${JSON.stringify(alarm.data)}`
          );
          if (!forceClear) {
            // We may need to hold this alarm when force clear is false
            if (alarm.date.getTime() <= expected) {
              hold = true; // When alarm time less than expected, we hold it
              continue;
            }
          }
        }
        // We remove 1st alarm if not hold it, and all others
        navigator.b2g.alarmManager.remove(alarm.id);
      }
    }
    this.debug(`setAlarm(), found=${found}, hold=${hold}`);
    if (!found || (found && !hold)) {
      // Alarm not found, or found but not hold, we need to add one
      let alarmDate = new Date(expected);
      let alarmData = {};
      alarmData[this._alarm[alarmType].tag] = true;
      await navigator.b2g.alarmManager.add({
        date: alarmDate,
        data: alarmData,
        ignoreTimezone: true,
      });
      this.debug(
        `setAlarm(), addAlarm, date=${alarmDate}, data=${JSON.stringify(
          alarmData,
          null,
          2
        )}`
      );
    }
  },

  async manageAlarm() {
    this.debug('manageAlarm()');
    if (this._alarm.check.missed) {
      if (this._alarm.install.missed) {
        this.debug(
          'manageAlarm(), both check/install alarm missing, delay install alarm'
        );
        this._alarm.install.missed = false;
        // Set next install alarm shortly
        let interval = this._fotaData['rule.auto'].install_prompt_delay_seconds;
        await this.setAlarm('install', interval, true);
      }
      this._alarm.check.missed = false;
      this.onCheckAlarm();
    } else {
      if (this._alarm.install.missed) {
        this._alarm.install.missed = false;
        this.onInstallAlarm();
      }
    }
    await this.initAlarm();
  },

  async initAlarm() {
    this.debug('initAlarm()');
    // When triggered by timechange, _fotaData may not be ready
    if (!this._fotaData) {
      return;
    }
    let interval = this._fotaData['rule.auto'].check_interval_seconds;
    await this.setAlarm('check', interval, false);
    if (this.isDownloadFinished()) {
      await this.setAlarm('install', this.getInstallInterval(), false);
    }
  },

  getInstallInterval() {
    this.debug('getInstallInterval()');
    let ruleAuto = this._fotaData['rule.auto'];
    let ruleUser = this._fotaData['rule.user'];
    let interval = ruleAuto.install_prompt_interval_seconds;
    let nightInstall = ruleUser.allow_night_install;
    if (nightInstall) {
      // Calculate next night alarm and use the little one
      let startHour = ruleAuto.night_install_start_hour;
      let endHour = ruleAuto.night_install_end_hour;
      let randomSeconds = Math.floor(
        Math.random() * ((endHour - startHour) * 3600)
      );
      let nextMidnight = new Date();
      nextMidnight.setHours(24, 0, 0, 0); // Set to next day
      nextMidnight.setHours(startHour, 0, 0, 0);
      let nextNightInterval = Math.floor((nextMidnight - new Date()) / 1000);
      nextNightInterval += randomSeconds;
      interval = Math.min(interval, nextNightInterval);
    }
    return interval;
  },

  isNightInstallTime() {
    this.debug('isNightInstallTime()');
    let startHour = this._fotaData['rule.auto'].night_install_start_hour;
    let endHour = this._fotaData['rule.auto'].night_install_end_hour;
    let currentHour = (new Date()).getHours();
    if (currentHour >= startHour && currentHour < endHour) {
      return true;
    }
    return false;
  },

  isDownloadFinished() {
    this.debug('isDownloadFinished()');
    if (this._fotaData && this._fotaData['record.download']) {
      let record = this._fotaData['record.download'];
      return record.downloaded_bytes === record.content_length;
    }
    return false;
  },

  isFotaAppAtFront() {
    //TODO: workaround here, may need a proper API
    let frontApp = Service.query('getTopMostWindow');
    let manifestUrl = frontApp.manifestUrl;
    if (manifestUrl.includes('fota')) {
      return true;
    }
    return false;
  },

  getFotaIconUrl() {
    //Note: I failed when using AppsManager.getApp to get app via manifestUrl
    //TODO: Fota icon, may need a proper API
    return `${window.AppOrigin.getOrigin('fota')}/images/icon_fota_112.png`;
  },

  getNetwork() {
    //TODO: may need change function to async later for whitelist dial issue
    let roaming = false;
    let primaryCardIdObj = this._settings.get('primaryCardId');
    if (primaryCardIdObj && navigator.b2g && navigator.b2g.mobileConnections) {
      let primaryCardId = primaryCardIdObj.value;
      let conn = navigator.b2g.mobileConnections[primaryCardId];
      if (conn && conn.data) {
        roaming = conn.data.roaming;
      }
    }
    //TODO: whiteList support should be done in this part
    //TODO: but dial/disconnect may not be done here
    switch (navigator.connection.type) {
      case 'cellular':
        return { roaming, netType: lib_fota.NetworkType.DATA };
      case 'wifi':
        return { roaming, netType: lib_fota.NetworkType.WIFI };
      case 'none':
      default:
        return { roaming, netType: lib_fota.NetworkType.OTHERS };
    }
  },

  showNotification(title, message, param) {
    this.debug(
      `showNotification, title=${title}; message=${message}; param=${param}`
    );
    // Do not display notification while fota app is running
    if (this.isFotaAppAtFront()) {
      return;
    }
    // On click, open Fota App
    var clickCB = function (evt) {
      evt.target.close();
      var activity = new WebActivity('launch-fota', { param: param });
      activity.start();
    };
    // Show notification
    var notification = new Notification(title, {
      body: message,
      icon: this.getFotaIconUrl(),
      tag: 'fota-notice'
    });
    notification.addEventListener('click', clickCB);
  },

  async onCheckComplete() {
    this.debug('onCheckComplete()');
    // Set next check alarm
    let interval = this._fotaData['rule.auto'].check_interval_seconds;
    this.setAlarm('check', interval, true); // We don't need to await this
    // See if we need to show notification and auto download
    let previousCheckRecord = this._fotaData['record.check'];
    let updatedData = await this._fota.getItem([
      'record.check',
      'record.download',
      'rule.necessary',
    ]);
    this._fotaData['record.check'] = updatedData['record.check'];
    this._fotaData['record.download'] = updatedData['record.download'];
    this._fotaData['rule.necessary'] = updatedData['rule.necessary'];
    if (
      this._fotaData['record.check'] &&
      this._fotaData['record.check'].result
    ) {
      // We have a check result now, see if we need notification
      let url = this._fotaData['record.check'].result.file_url;
      let needNotify = true;
      if (previousCheckRecord && previousCheckRecord.result) {
        if (previousCheckRecord.result.file_url === url) {
          // After compared, no need to notify since record is not new
          needNotify = false;
        }
      }
      if (needNotify) {
        let title = window.api.l10n.get('fota-title-software-update');
        let message = window.api.l10n.get(
          'fota-message-software-update-available'
        );
        this.showNotification(title, message, 'onUpdateFound');
      }
      // see if we need to start download
      if (!this.isDownloadFinished()) {
        // Download necessary is same with auto download prop in check result
        let necessary = this._fotaData['record.check'].result.auto_download;
        this._fota.download(necessary, this._TRIGGER, this.getNetwork());
      }
    }
  },

  async onDownloadComplete(extra) {
    this.debug(`onDownloadComplete(), extra=${JSON.stringify(extra, null, 2)}`);
    let updatedData = await this._fota.getItem([
      'record.download',
      'rule.necessary',
    ]);
    this._fotaData['record.download'] = updatedData['record.download'];
    this._fotaData['rule.necessary'] = updatedData['rule.necessary'];
    if (this.isDownloadFinished()) {
      this.prepareInstall();
      // We don't need to await prepareInstall to be done here
    } else {
      let isUserTriggered = extra.initiator && extra.initiator === 'User';
      let isAutoDownload = false;
      if (
        this._fotaData['record.check'] &&
        this._fotaData['record.check'].result
      ) {
        isAutoDownload = this._fotaData['record.check'].result.auto_download;
      }
      if (isUserTriggered && !isAutoDownload && this._fotaError.downloading) {
        let title = window.api.l10n.get('fota-title-software-update');
        let message = window.api.l10n.get(
          'fota-message-software-download-failed'
        );
        this.showNotification(title, message, 'onDownloadFailed');
      }
    }
  },

  async onInstallBroken() {
    this.debug('onInstallBroken()');
    let updatedData = await this._fota.getItem([
      'record.download',
      'record.install',
      'rule.necessary',
    ]);
    this._fotaData['record.download'] = updatedData['record.download'];
    this._fotaData['record.install'] = updatedData['record.install'];
    this._fotaData['rule.necessary'] = updatedData['rule.necessary'];
    if (this._fotaError.installing) {
      switch (this._fotaError.installing.e) {
        case lib_fota.Error.LOW_BATTERY:
          this.showLowBatteryDialog();
          break;
        case lib_fota.Error.NOT_ENOUGH_SPACE:
          this.showNotEnoughSpaceDialog();
          break;
        default:
          break;
      }
    }
    // Set next install alarm
    if (this.isDownloadFinished()) {
      await this.setAlarm('install', this.getInstallInterval(), true);
    }
  },

  prepareInstall() {
    this.debug('prepareInstall()');
    // Test if audio channel is busy
    let currentChannel = Service.query('currentChannel');
    let isAudioChannelBusy = currentChannel && currentChannel !== 'none';
    if (isAudioChannelBusy) {
      // Audio channel is busy, wait it to be changed
      window.addEventListener(
        'audiochannelchanged',
        this.prepareInstall.bind(this),
        { once: true }
      );
      return;
    }
    // Test if we're in emergency callback mode
    let isInEmergencyCbMode = false;
    for (let conn of navigator.b2g.mobileConnections) {
      try {
        if (conn.isInEmergencyCbMode) {
          // May throw exception here
          isInEmergencyCbMode = true;
          break;
        }
      } catch (err) {
        this.debug(err.message, true);
      }
    }
    if (isInEmergencyCbMode) {
      // We're in emergency mode, delay next install alarm, no need to wait
      this.setAlarm('install', this.getInstallInterval(), true);
      return;
    }
    this.showInstallDialog();
  },

  onStateChange(to, from, extra) {
    this.debug(
      `onStateChange(), from=${from}, to=${to}, extra=${JSON.stringify(
        extra,
        null,
        2
      )}`
    );
    this._fotaState = to;
    switch (to) {
      case lib_fota.State.IDLE: {
        switch (from) {
          case lib_fota.State.POST_CHECKING:
          case lib_fota.State.CHECKING:
            this.onCheckComplete();
            return;
          case lib_fota.State.POST_DOWNLOADING:
          case lib_fota.State.DOWNLOADING:
            this.onDownloadComplete(extra);
            return;
          default:
        }
        break;
      }
      case lib_fota.State.PRE_CHECKING: {
        this._fotaError.checking = null;
        this._fota.resume(true, this._TRIGGER, this.getNetwork());
        break;
      }
      case lib_fota.State.PRE_DOWNLOADING: {
        this._fotaError.downloading = null;
        this._fota.resume(true, this._TRIGGER, this.getNetwork());
        break;
      }
      case lib_fota.State.PRE_INSTALLING: {
        this._fotaError.installing = null;
        this._fota.resume(true, this._TRIGGER, this.getNetwork());
        break;
      }
      case lib_fota.State.POST_CHECKING:
      case lib_fota.State.POST_DOWNLOADING: {
        // No need for network on POST states
        this._fota.resume(true, this._TRIGGER);
        break;
      }
      case lib_fota.State.POST_INSTALLING: {
        if (from === lib_fota.State.INSTALLING) {
          this.onInstallBroken();
          // No need for network on POST states
          this._fota.resume(true, this._TRIGGER);
        }
        break;
      }
      case lib_fota.State.INSTALLING: {
        this.debug('No need to handle INSTALLING');
        break;
      }
      default:
        this.debug('onStateChange(), unhandled state change');
        break;
    }
  },

  onConfigChange(key, from, to, extra) {
    this.debug(`onConfigChange(), key=${key}, from=${from}, to=${to}`);
    this.debug(`onConfigChange(), extra=${JSON.stringify(extra, null, 2)}`);
    switch (key) {
      case 'rule.user.allow_download_via_data':
        this._fotaData['rule.user'].allow_download_via_data = to;
        break;
      case 'rule.user.allow_night_install': {
        this._fotaData['rule.user'].allow_night_install = to;
        // Night install config may affect next install alarm
        if (this.isDownloadFinished()) {
          this.setAlarm('install', this.getInstallInterval(), false);
        }
        break;
      }
      case 'rule.condition.fota_enabled':
      default:
        this.debug('onConfigChange(), unhandled config change');
        break;
    }
  },

  async onError(e, data, extra) {
    this.debug(
      `onError(), e=${e}, data=${JSON.stringify(
        data,
        null,
        2
      )}, extra=${JSON.stringify(extra, null, 2)}`,
      true
    );
    switch (this._fotaState) {
      case lib_fota.State.CHECKING:
        this._fotaError.checking = { e, data, extra };
        break;
      case lib_fota.State.DOWNLOADING:
        this._fotaError.downloading = { e, data, extra };
        break;
      case lib_fota.State.INSTALLING:
        if (
          e === lib_fota.Error.LOW_BATTERY ||
          e === lib_fota.Error.NOT_ENOUGH_SPACE
        ) {
          // We only need to keep battery/space error here
          this._fotaError.installing = { e, data, extra };
        }
        break;
      default:
        break;
    }
    // Although the probability is very small, install may broken on state error
    // When this happens, we need to set next install alarm to avoid missing it.
    if (e === lib_fota.Error.STATE_ERROR) {
      if (
        data.from === 'Idle' &&
        (data.to === 'Suspended(PreInstalling)' || data.to === 'Installing')
      ) {
        let updatedData = await this._fota.getItem(['rule.necessary']);
        this._fotaData['rule.necessary'] = updatedData['rule.necessary'];
        if (
          this._fotaData['rule.necessary'] &&
          this._fotaData['rule.necessary'] &&
          this._fotaData['rule.necessary'].install
        ) {
          await this.setAlarm('install', this.getInstallInterval(), false);
        }
      }
    }
  },

  showInstallDialog() {
    if (this.isFotaAppAtFront()) {
      this.debug('showInstallDialog() returned because fota app at front');
      // When app at front, we may skip "auto install" and it's allowed
      this.setAlarm('install', this.getInstallInterval(), true);
      return;
    }
    // Prepare necessary variables
    let countDownNeeded =
      this._fotaData['rule.user'].allow_night_install &&
      this.isNightInstallTime();
    let laterAllowed = true;
    if (
      this._fotaData['record.check'] &&
      this._fotaData['record.check'].result
    ) {
      // When "auto install", we disallow later to be displayed
      laterAllowed = !this._fotaData['record.check'].result.auto_install;
    }
    this.debug(
      `showInstallDialog(), later=${laterAllowed}, count=${countDownNeeded}`
    );
    const id = 'fota-install-prompt';
    let header = window.api.l10n.get('fota-title-software-update');
    let content = window.api.l10n.get('fota-content-install-prompt');
    let countDownSeconds = this._fotaData['rule.auto']
      .install_prompt_countdown_seconds;
    let installButtonText = window.api.l10n.get(
      countDownNeeded ? 'fota-install-countdown' : 'fota-install',
      { n: countDownSeconds }
    );
    // Prepare event handlers
    let eventTarget = new EventTarget();
    let startInterval = () => {
      this._context.countDownSeconds = countDownSeconds;
      this._context.installIntervalId = setInterval(() => {
        this._context.countDownSeconds--;
        if (this._context.countDownSeconds <= 0) {
          // Countdown condition met, install
          eventTarget.dispatchEvent(new CustomEvent('install'), {
            detail: true,
          });
          return;
        }
        // Set button text with updated countdown seconds
        let buttonText = window.api.l10n.get('fota-install-countdown', {
          n: this._context.countDownSeconds,
        });
        let buttonElement = document.getElementById('software-keys-right');
        if (buttonElement) {
          buttonElement.innerHTML = buttonText;
        }
      }, 1000);
    };
    let onTopMostWindowChanged = () => {
      // When top most window is attention Window, install later
      let topMostWindow = Service.query('getTopMostWindow');
      if (topMostWindow.isCallscreenWindow || topMostWindow.isAttentionWindow) {
        this.debug('showInstallDialog(), got window change, install later');
        eventTarget.dispatchEvent(
          new CustomEvent('install', { detail: false })
        );
      }
    };
    let cleanup = () => {
      window.removeEventListener(
        'hierarchytopmostwindowchanged',
        onTopMostWindowChanged
      ); // Stop listening topmost window change
      if (this._context.installIntervalId) {
        // Clear interval if we have
        clearInterval(this._context.installIntervalId);
        this._context.installIntervalId = null;
      }
      Service.request('DialogService:hide', id); // Close dialog
    }
    eventTarget.addEventListener('install', (event) => {
      cleanup();
      if (event.detail) { // install
        let currentChannel = Service.query('currentChannel');
        let isAudioChannelBusy = currentChannel && currentChannel !== 'none';
        if (!isAudioChannelBusy) {
          this._fota.install(true, this._TRIGGER);
          return;
        }
        this.debug('Audio channel is busy, cannot install');
    }
      else { // later
        this.debug('Install later event received');
      }
      // Set next install alarm
      this.setAlarm('install', this.getInstallInterval(), true);
    }, { once: true });

    let onOk = (value) => {
      switch (value.selectedButton) {
        case 0: // Left, Later when laterAllowed
          if (laterAllowed) {
            eventTarget.dispatchEvent(
              new CustomEvent('install', { detail: false })
            );
          }
          break;
        case 2: // Right, Install
          eventTarget.dispatchEvent(
            new CustomEvent('install', { detail: true })
          );
          break;
        case 1: // Center, no response
        default:
          break;
      }
    };
    let buttons = [
      // Left key will only display when laterAllowed
      laterAllowed
        ? { message: window.api.l10n.get('fota-later') }
        : { message: '' },
      { message: '' }, // Center
      { message: installButtonText }, // Right
    ];
    cleanup();
    // Show dialog
    Service.request('DialogService:show', {
      id,
      header,
      content,
      type: 'custom',
      buttons,
      onOk,
      noClose: true,
      translated: true,
    });
    window.addEventListener(
      'hierarchytopmostwindowchanged',
      onTopMostWindowChanged
    );
    if (countDownNeeded) {
      startInterval();
    }
  },

  showLowBatteryDialog() {
    if (this.isFotaAppAtFront()) {
      this.debug('showLowBatteryDialog() returned because fota app at front');
      return;
    }
    this.debug('showLowBatteryDialog()');
    let threshold = this._fotaData['rule.battery'].install_percentage;
    let thresholdCharging = this._fotaData['rule.battery']
      .install_percentage_charging;
    let header = window.api.l10n.get('fota-title-software-update');
    let content = window.api.l10n.get(
      thresholdCharging
        ? 'fota-content-battery-error2'
        : 'fota-content-battery-error1',
      { n: threshold, n2: thresholdCharging }
    );
    Service.request('DialogService:show', {
      header: header,
      content: content,
      ok: 'back',
      type: 'alert',
      translated: true,
    });
  },

  showNotEnoughSpaceDialog() {
    if (this.isFotaAppAtFront()) {
      this.debug(
        'showNotEnoughSpaceDialog() returned because fota app at front'
      );
      return;
    }
    this.debug('showNotEnoughSpaceDialog()');
    let reservedSpace = Math.ceil(
      this._fotaData['rule.space'].data_reserved_bytes / 1024 / 1024
    );
    let header = window.api.l10n.get('fota-title-software-update');
    let content = window.api.l10n.get('fota-content-space-error', {
      size: `${reservedSpace} MB`,
    });
    Service.request('DialogService:show', {
      header: header,
      content: content,
      ok: 'back',
      type: 'alert',
      translated: true,
    });
  },

  async showInstallResultDialogAtBoot() {
    this.debug('showInstallResultDialogAtBoot()');
    //TODO: record.install format may change in the future
    let updatedData = await this._fota.getItem(['record.install']);
    this._fotaData['record.install'] = updatedData['record.install'];
    const INSTALL_RESULT_SUCCEEDED = 999;
    let header = window.api.l10n.get('fota-title-attention');
    let content =
      this._fotaData['record.install'].code === INSTALL_RESULT_SUCCEEDED
        ? window.api.l10n.get('fota-upgrade-success', {
            target: this._fotaData['record.install'].to_version,
          })
        : window.api.l10n.get('fota-upgrade-failed');
    Service.request('DialogService:show', {
      header: header,
      content: content,
      ok: 'back',
      type: 'alert',
      translated: true,
    });
  },

  registerEndpoint(endpoint) {
    this.debug(`registerEndpoint(), endpoint=${endpoint}`);
    this._endpoint = endpoint;
    if (this._ready) {
      this._fota.registerEndpoint(this._endpoint, this.getNetwork());
    }
  },

  onNetworkChanged() {
    this.debug(`onNetworkChanged(), connection=${navigator.connection.type}`);
    switch (navigator.connection.type) {
      case 'cellular': {
        if (this._fotaState === lib_fota.State.DOWNLOADING) {
          // We may need to cancel download on wifi switch to data case
          let wifiOnly = this._fotaData['rule.network'].wifi_only;
          if (wifiOnly === null || wifiOnly === undefined) {
            wifiOnly = !this._fotaData['rule.user'].allow_download_via_data;
          }
          if (wifiOnly) {
            this._fota.cancelDownload(true, this._TRIGGER);
          }
          return;
        }
        break;
      }
      case 'wifi':
        break;
      case 'none':
      default:
        // No network, nothing to do
        return;
    }
    // Got here means wifi connected, or cellular with wifi_only === false
    if (this._fotaData['rule.necessary'].check) {
      this._fota.check(false, this._TRIGGER, this.getNetwork());
    } else {
      this._fota.download(false, this._TRIGGER, this.getNetwork());
    }
  },

  async onReady() {
    this.debug('onReady()');
    if (!this._ready) {
      return;
    }
    let fota = this._fota;
    if (this._endpoint) {
      this.debug(`onReady(), endpoint=${this._endpoint}`);
      this._fota.registerEndpoint(this._endpoint, this.getNetwork());
    }
    fota.addEventListener(fota.STATE_CHANGE_EVENT, (val) =>
      this.onStateChange(val.to, val.from, val.extra)
    );
    fota.addEventListener(fota.CONFIG_CHANGE_EVENT, (val) =>
      this.onConfigChange(val.key, val.from, val.to, val.extra)
    );
    // We don't need to listen fota.SIZE_CHANGE_EVENT here
    fota.addEventListener(fota.ERROR_EVENT, (val) =>
      this.onError(val.e, val.data, val.extra)
    );
    this._fotaData = await fota.getItem([
      'url',
      'pseudo',
      'version',
      'rule.auto',
      'rule.battery',
      'rule.condition',
      'rule.necessary',
      'rule.network',
      'rule.save',
      'rule.space',
      'rule.suspend',
      'rule.user',
      'rule.verify',
      'record.check',
      'record.download',
      'record.install',
    ]);
    this.debug(`this._fotaData=${JSON.stringify(this._fotaData, null, 2)}`);
    this._fotaState = await fota.state;
    this.debug(`this._fotaState=${JSON.stringify(this._fotaState)}`);
    switch (this._fotaState) {
      case lib_fota.State.POST_INSTALLING:
        this.showInstallResultDialogAtBoot();
        fota.resume(true, this._TRIGGER); // Resume from PostInstalling to Idle
        break;
      case lib_fota.State.IDLE:
        // Recover possible broken download if necessary
        fota.download(false, this._TRIGGER, this.getNetwork());
        break;
      default:
        this.debug(
          `onReady(), wrong state when start, fota.state=${JSON.stringify(
            this._fotaState
          )}`,
          true
        );
    }
    this.manageAlarm();
  },

  onInitFailure(reason) {
    this.debug(`onInitFailure(), reason=${reason}`, true);
  },

  onInitStepForward() {
    if (this._ready || !this._fota) {
      return;
    }
    for (let value of this._settings.values()) {
      if (!value.inited) {
        return; // Settings init not finished
      }
    }
    this.debug('onInitStepForward(), ready');
    this._ready = true;
    this.onReady();
  },

  async init() {
    this.debug('init');
    class FotaSettingsObserver extends lib_settings.SettingObserverBase {
      constructor(service, session, obj) {
        super(service.id, session);
        this._obj = obj;
      }
      display() {
        return 'Setting observer';
      }
      callback(v) {
        this._obj.value = v.value;
      }
    }
    this._settings.forEach(async (value) => {
      let observer = new FotaSettingsObserver(
        window.api.settingsmanager,
        window.api.session,
        value
      );
      window.api.settingsmanager.addObserver(value.key, observer);
      window.api.settingsmanager.get(value.key).then(
        (obj) => {
          value.value = obj.value;
          value.inited = true;
          this.onInitStepForward();
        },
        (e) => {
          this.debug(
            `Failed to get ${value.key} from settings, reason=${JSON.stringify(
              e
            )}, init with default value: ${JSON.stringify(value.default)}`
          );
          value.value = value.default;
          value.inited = true;
          this.onInitStepForward();
        }
      );
    });
    let onFotaReady = () => {
      this.debug('onFotaReady');
      FotaAgent._fota = window.api.fota;
      FotaAgent._TRIGGER = lib_fota.Trigger.SYSTEM;
      FotaAgent.onInitStepForward();
    };
    let isReady = await window.api.fota.isReady();
    if (isReady) {
      onFotaReady();
    } else {
      window.api.fota.addEventListener(
        window.api.fota.READY_EVENT,
        onFotaReady,
        { once: true }
      );
    }
  },

  uninit() {
    this.debug('uninit');
    this._ready = false;
    this._fota = null;
    this._fotaData = null;
    this._fotaState = null;
    for (let value of this._settings.values()) {
      value.inited = false;
      value.value = value.default;
    }
  },

  onFtuDoneOrSkip(done) {
    this.debug(`received ${done ? 'ftudone' : 'ftuskip'}`);
    window.removeEventListener('ftudone', FotaAgent._onFtuDone);
    window.removeEventListener('ftuskip', FotaAgent._onFtuSkip);
    // When service load again, do re-init
    window.addEventListener('services-load-complete', () => this.init());
    this.init(); // Load & observe settings, load fota

    // Register push for fota here
    FotaAgent.debug('register push for fota after ftudone/ftuskip');
    const proxyFrame = window.document.getElementById('sw-proxy');
    proxyFrame.contentWindow.postMessage(
      { type: 'register-push', scope: SCOPE_FOTA },
      proxyFrame.src
    );
  },
}; // FotaAgent

// Init alarm callback
AlarmMessageHandler.addCallback((alarm) => FotaAgent.onAlarm(alarm));
// Store _onFtuDone and _onFtuSkip for removeEventListener in onFtuDoneOrSkip
FotaAgent._onFtuDone = () => FotaAgent.onFtuDoneOrSkip(true);
FotaAgent._onFtuSkip = () => FotaAgent.onFtuDoneOrSkip(false);
// Start fota agent via ftudone or ftuskip event
window.addEventListener('ftudone', FotaAgent._onFtuDone);
window.addEventListener('ftuskip', FotaAgent._onFtuSkip);
// Start observing network change
navigator.connection.addEventListener('typechange', () =>
  FotaAgent.onNetworkChanged()
);
// Start observing timechange
window.addEventListener('timechange', () => FotaAgent.initAlarm());
// Uninit
window.addEventListener('session-disconnected', () => FotaAgent.uninit());
// Push
window.addEventListener('serviceworkermessage', ({ detail }) => {
  const { type, scope, subscription } = detail;
  if (scope === SCOPE_FOTA) {
    FotaAgent.debug(`got fota push message, detail=${JSON.stringify(detail)}`);
    switch (type) {
      case 'subscription': {
        FotaAgent.registerEndpoint(subscription.endpoint);
        break;
      }
      case 'push': {
        FotaAgent.onCheckAlarm(true);
        break;
      }
      default:
        break;
    }
  }
});
// Ensure fota agent start if we missed ftuskip/ftudone event
if (FtuLauncher.isFinished()) {
  FotaAgent.debug('FtuLauncher.isFinished(), take as ftuskip');
  FotaAgent._onFtuSkip();
}
