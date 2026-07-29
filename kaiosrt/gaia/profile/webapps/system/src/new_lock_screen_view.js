/* global Service, DeviceCapabilityManager, SettingsObserver */

import React from 'react';
import BaseComponent from 'base-component';
import SoftKeyStore from 'soft-key-store';
import * as utils from './util/utils';
import EnhanceAnimation from './enhance_animation';
import Clock from './clock';
import NotificationStore from './notification_store';

import LockscreenNotification from './lockscreen/lockscreen_notification';
import SimcardInfo from './lockscreen/simcard_info';
import LockmodePocket from './lockscreen/lockmode_pocket';
import Passcode from './lockscreen/passcode';
import PasscodeRemoteLock from './lockscreen/passcode_remote_lock';
import DeviceFinancingLock from './lockscreen/device_financing_lock';
import './lockscreen/lockscreen_migrator';

import '../scss/lockscreen/lockscreen.scss';

class LockscreenView extends BaseComponent {
  name = 'LockscreenView';

  DEBUG = false;

  EVENT_PREFIX = 'lockscreen-';

  isPocketDevice = true;
  firstLaunch = true;
  autoLockEnabled = false;
  lastElement = null;
  remoteLockEnabled = false;
  dmLock = undefined;
  appOpening = false;
  wrongPasscodeInfo = {
    errorTimes: 0,
    retryTimestamp: 0
  }
  /**
   * To keep the origin screen orientation
   * even the other app changed the orientation(e.g. Video app)
   * before going to lock state.
   */
  _originOrientationType = screen.orientation.type;

  /**
   * To retore the last orientation type set by other app.
   */
  _lastOrientationType = screen.orientation.type;

  constructor(props) {
    super(props);
    this.state = {
      // none, pocket, passcode, remotePasscode, deviceFinancingLocked
      mode: 'none',
      lockEnabled: false,
      remoteLockEnabled: false,
      deviceFinancingLockStatus: false,
      notificationEnabled: false
    };

    this.unlock = this.pocketUnlocked.bind(this);
    this.pocketUnlocked = this.pocketUnlocked.bind(this);
    this.passcodeUnlocked = this.passcodeUnlocked.bind(this);
    this.remotePasscodeUnlocked = this.remotePasscodeUnlocked.bind(this);
    this.handleSecurAppClosed = this.handleSecurAppClosed.bind(this);
    this.initRemoteLockStatus();
  }

  initRemoteLockStatus() {
    SettingsObserver.getValue('lockscreen.remote-lock').then((lockInfo) => {
      this.remoteLockEnabled = !!(lockInfo && lockInfo[1]);
    });
  }

  setHierarchy(value) {
    if (value) {
      this.focus();
      this.updateSoftKeys();
    } else {
      if (this.lastElement) {
        SoftKeyStore.unregister(this.lastElement);
      }
    }
  }

  _handle_timechange() {
    if (this.wrongPasscodeInfo.errorTimes) {
      const retryTimestamp = Date.now();
      SettingsObserver.setValue([{
        name: 'lockscreen.wrong.code.info',
        value: {
          errorTimes: this.wrongPasscodeInfo.errorTimes,
          retryTimestamp
        }
      }]);
    }
  }

  '_observe_lockscreen.wrong.code.info'(value) {
    if (value && value.errorTimes) {
      this.wrongPasscodeInfo.errorTimes = value.errorTimes;
      this.wrongPasscodeInfo.retryTimestamp = value.retryTimestamp;
    } else {
      this.wrongPasscodeInfo.errorTimes = 0;
      this.wrongPasscodeInfo.retryTimestamp = 0;
    }
  }

  '_observe_lockscreen.unlocked'(unlocked) {
    if (unlocked) {
      this.setState({
        mode: 'none'
      });
    }
  }

  '_observe_lockscreen.enabled'(lockEnabled) {
    this.debug('observed lockEnabled:', lockEnabled);
    this.setState({
      lockEnabled
    });
    if (this.firstLaunch) {
      this.lockIfEnabled();
      this.firstLaunch = false;
    }
  }

  '_observe_lockscreen.notifications-preview.enabled'(value) {
    this.setState({
      notificationEnabled: value
    });
  }

  '_observe_lockscreen.lock-immediately'(value) {
    if (value === true) {
      this.lockIfEnabled();
      Service.request('turnScreenOn', 'lock-immediately');
    }
  }

  '_observe_pocketmode.autolock.enabled'(value) {
    if (value === undefined) {
      value = true;
    }
    this.autoLockEnabled = !!value;
  }

  // detect whether should enable remote lock or not
  // let PasscodeRemoteLock manage the passcode value
  '_observe_lockscreen.remote-lock'(value) {
    this.debug('_observe_lockscreen.remote-lock:', value);
    const remoteLockEnabled = !!(value && value[1]);
    this.remoteLockEnabled = remoteLockEnabled;
    this.setState({
      remoteLockEnabled
    });

    if (remoteLockEnabled) {
      this.setMode('remotePasscode');
      Service.request('turnScreenOn', 'remote-lock');
    }
  }

  '_observe_dm.lockscreen.passcode-lock.code'(value) {
    if (value) {
      this.dmLock = true;
      SettingsObserver.setValue([{
        name: 'lockscreen.passcode-lock.code',
        value: value
      }, {
        name: 'lockscreen.passcode-lock.enabled',
        value: true
      }, {
        name: 'lockscreen.enabled',
        value: true
      }]).then(() => {
        if (this.state.mode === 'none') {
          if (this.autoLockEnabled) {
            this.setMode('pocket');
          } else {
            this.setMode('passcode');
          }
        }
      });
      this._hangUpAllCalls();
      this._killAllApps();
    } else {
      if (this.dmLock === undefined) {
        this.dmLock = false;
        return;
      }
      this.dmLock = false;
      SettingsObserver.setValue([{
        name: 'lockscreen.passcode-lock.enabled',
        value: false
      }, {
        name: 'lockscreen.enabled',
        value: false
      }]).then(() => {
        if (this.state.mode === 'passcode') {
          this.setMode('none');
        }
      });
    }
  }

  lockIfEnabled() {
    if (Service.query('isDeepCleanupMemory')) {
      return;
    }
    // Prioritize anti-theft lock
    if (this.state.deviceFinancingLockStatus) {
      this.setMode('deviceFinancingLocked');
    } else if (this.state.remoteLockEnabled) {
      this.setMode('remotePasscode');
    } else if (this.state.lockEnabled) {
      this.setMode('passcode');
    }
  }

  componentDidUpdate(prevProps, prevState) {
    this.debug('did update: mode, lockEnabled:', this.state.mode, this.state.lockEnabled);
    this.publish('lockmode-change', {
      mode: this.state.mode
    }, true);
    requestAnimationFrame(() => {
      this.publish('lockmode-change', {
        mode: this.state.mode
      }, true);
    });
    if (prevState.mode === 'none') {
      let topMostWindow = Service.query('getTopMostWindow');
      // force exit fullscreen mode in browser and backup the default orientation.
      if (topMostWindow && topMostWindow.isBrowser() &&
        screen.orientation.type.startsWith('landscape') &&
        document.mozFullScreen) {
        document.exitFullscreen();
        this.lastOrientationType = Service.query('globalOrientation');
      } else {
        this.lastOrientationType = screen.orientation.type;
      }
    }

    if (this.state.mode === 'none') {
      screen.orientation.lock(this._lastOrientationType);
      this.publish('lockscreen-request-unlock', null, true);
      this.close();
      this._toggleLockedSetting(false);
      this._clearDMLockedSettings();
    } else if (this.state.mode === 'pocket' ||
      (this.state.lockEnabled && this.state.mode === 'passcode') ||
      this.state.mode === 'deviceFinancingLocked' ||
      this.state.remoteLockEnabled) {
      screen.orientation.lock(this._originOrientationType);
      this.open();
      Service.request('focus');
      this._toggleLockedSetting(true);
    }
    this.updateSoftKeys();
  }

  componentDidMount() {
    this.debug('did mount');
    // init some handlers
    this._init();

    // bug-8909 should be landed to have correct device.flip
    DeviceCapabilityManager.get('device.flip').then(isFliptype => {
      if (isFliptype === undefined) {
        this.debug('got device.flip undefined! should be true or false');
        // default non-bartype for old device build
        this.isPocketDevice = false;
      } else {
        this.isPocketDevice = !isFliptype;
      }

      this.debug('Detected isPocketDevice:', this.isPocketDevice);
    });

    this.updateSoftKeys();
  }

  updateSoftKeys() {
    let config = {};

    switch (this.state.mode) {
      case 'deviceFinancingLocked':
        config = {
          left: utils.toL10n('emergency-call'),
          center: '',
          right: utils.toL10n('df-mymobill')
        };
        break;
      case 'passcode':
        config = {
          left: utils.toL10n('emergency-call'),
          center: '',
          right: Service.query('isDMLockMode') ? '' : utils.toL10n('camera')
        };
        break;
      case 'remotePasscode':
          config = {
            left: utils.toL10n('emergency-call'),
            center: '',
            right: ''
          };
          break;
      default:
        break;
    }
    if (this.lastElement && this.lastElement !== this.element) {
      SoftKeyStore.unregister(this.lastElement);
    }
    SoftKeyStore.register(config, this.element);
    this.lastElement = this.element;
  }

  /**
   * Initialization for both bartype and go_flip
   */
  _init() {
    window.addEventListener('beforescreenoff', this);
    window.addEventListener('device-lock-state-update', this);
    window.addEventListener('timechange', this);
    window.addEventListener('visibilitychange', this);

    window.Service.request('registerHierarchy', this);
    window.Service.registerState('locked', this);
    window.Service.registerState('isPocketMode', this);
    window.Service.registerState('isDMLockMode', this);
    window.Service.registerState('remoteLockEnabled', this);
    window.Service.registerState('wrongPasscodeInfo', this);
    window.Service.register('lock', this);
    window.Service.register('unlock', this);

    SettingsObserver.observe('lockscreen.wrong.code.info', '',
      this['_observe_lockscreen.wrong.code.info'].bind(this));
    SettingsObserver.observe('lockscreen.unlocked', true,
      this['_observe_lockscreen.unlocked'].bind(this), true);
    SettingsObserver.observe('lockscreen.enabled', false,
      this['_observe_lockscreen.enabled'].bind(this));
    SettingsObserver.observe('lockscreen.lock-immediately', false,
      this['_observe_lockscreen.lock-immediately'].bind(this));
    SettingsObserver.observe('lockscreen.notifications-preview.enabled', true,
      this['_observe_lockscreen.notifications-preview.enabled'].bind(this));
    SettingsObserver.observe('lockscreen.remote-lock', ['', ''],
      this['_observe_lockscreen.remote-lock'].bind(this));
    SettingsObserver.observe('pocketmode.autolock.enabled', false,
      this['_observe_pocketmode.autolock.enabled'].bind(this));
    SettingsObserver.observe('dm.lockscreen.passcode-lock.code', '',
      this['_observe_dm.lockscreen.passcode-lock.code'].bind(this));
  }

  '_handle_device-lock-state-update'() {
    const status = Service.query('isDeviceLocked');
    if (this.state.deviceFinancingLockStatus === status) {
      return;
    }
    this.state.deviceFinancingLockStatus = status;
    if (status) {
      this.setMode('deviceFinancingLocked');
    } else {
      this.setMode('none');
      this.lockIfEnabled();
    }
  }

  /**
   * For bartype, when screen on again, open in 'pocket' mode
   * For go_flip, depends on user set lockEnabled or not
   */
  _handle_beforescreenoff(evt) {
    // Don't lock if screen is turned off by promixity sensor.
    if (evt.detail.screenOffBy == 'proximity') {
      return;
    }
    this.debug('beforescreenoff: isPocketDevice, mode:', this.isPocketDevice, this.state.mode);

    let mode;
    if (this.state.remoteLockEnabled) {
      mode = 'remotePasscode';
    } else if (this.isPocketDevice && (this.autoLockEnabled || this.isPocketMode())) {
      mode = 'pocket';
    } else if (this.state.deviceFinancingLockStatus) {
      mode = 'deviceFinancingLocked';
    } else if (this.state.lockEnabled) {
      mode = 'passcode';
    } else {
      mode = 'none';
    }
    this.setMode(mode);
  }

  // To make sure read out the content
  _handle_visibilitychange() {
    if (this.element) {
      this.element.setAttribute('aria-hidden', document.hidden);
    }
  }

  _toggleLockedSetting(value) {
    if (value && !this.state.lockEnabled) {
      return;
    }
    SettingsObserver.setValue([{
      name: 'lockscreen.locked',
      value: value
    }]);
  }

  _clearDMLockedSettings() {
    if (this.dmLock) {
      SettingsObserver.setValue([{
        name: 'dm.lockscreen.passcode-lock.code',
        value: ''
      }, {
        name: 'lockscreen.passcode-lock.enabled',
        value: false
      }]);
      this.dmLock = false;
    }
  }

  _killAllApps() {
    if (Service.query('isFtuRunning')) {
      return;
    }
    let apps = window.appWindowManager.getApps();
    Object.keys(apps).forEach((id) => {
      if (apps[id] && !apps[id].isHomescreen) {
        window.appWindowManager.kill(apps[id].manifestUrl || apps[id].origin);
      }
    });
  }

  _hangUpAllCalls() {
    const telephony = navigator.b2g.telephony;
    if (!telephony) {
      return;
    }
    for (let i = 0; i < telephony.calls.length; i++) {
      const call = telephony.calls[i];
      call.hangUp();
    }
    if (telephony.conferenceGroup.calls.length ||
      telephony.conferenceGroup.state !== '') {
      telephony.conferenceGroup.hangUp()
    }
  }

  onKeyDown(evt) {
    switch (evt.key) {
      case 'EndCall':
        // back to pocketmode if available
        if (this.isPocketDevice && this.state.mode != 'pocket' &&
            this.autoLockEnabled && !this.state.remoteLockEnabled) {
          this.setMode('pocket');
        }
        break;
    }
  }

  focus() {
    if (this.activeLock) {
      this.activeLock.focus();
    }
  }

  lock = () => {
    if (!this._ensureLockable()) {
      return;
    }
    if (this.state.mode == 'none') {
      this.debug('to pocket mode');
      this.setMode('pocket');
    }
  };

  pocketUnlocked() {
    if (!this._ensureLockable()) {
      return;
    }
    this.debug('pocketUnlocked:');
    NotificationStore.resetNewComingCount();
    if (this.state.deviceFinancingLockStatus) {
      this.setMode('deviceFinancingLocked');
    } else if (this.state.lockEnabled) {
      this.setMode('passcode');
    } else {
      this.setMode('none');
    }
  }

  _ensureLockable() {
    let _topName = Service.query('getTopMostUI').name;
    let _topWindow = Service.query('getTopMostWindow');
    let _topWindowIsHome = _topWindow && _topWindow.isHomescreen;

    // permit to lock/unlock only in this view, option menu & homescreen
    return (
      _topName === 'LockscreenView' ||
      _topName === 'SystemOptionMenu' ||
      (
        _topWindowIsHome &&
        _topName === 'AppWindowManager'
      )
    );
  }

  passcodeUnlocked() {
    this.debug('passcodeUnlocked:');
    this.setMode('none');
  }

  remotePasscodeUnlocked() {
    this.debug('passcodeRemoteUnLock:');
    if (this.state.lockEnabled) {
      this.setMode('passcode');
    } else {
      this.setMode('none');
    }
  }

  locked() {
    return this.isActive();
  }

  isPocketMode() {
    return this.state.mode === 'pocket';
  }

  isDMLockMode() {
    return !!this.dmLock;
  }

  /**
   * Set lock mode and do lock
   */
  setMode(mode) {
    this.debug('set to mode:', mode);
    this.setState({ mode });
    SettingsObserver.setValue([{
      name: 'lockscreen.mode',
      value: mode
    }]);
  }

  invokeSecureApp(name) {
    if (this.appOpening) {
      return;
    }
    const manifestUrl = window.AppOrigin.getManifestURL(name);
    const { origin } = new URL(manifestUrl);
    const url = `${origin}/index.html#secure`;
    const app = applications.getByManifestURL(manifestUrl);
    if (app.status) {
      return;
    }
    if (Service.query('promptRestrictedAppDialog',
      { manifestUrl: manifestUrl })) {
      return;
    }

    this.appOpening = true;
    window.addEventListener('secure-appclosed', this.handleSecurAppClosed);
    window.dispatchEvent(new window.CustomEvent('secure-launchapp',
      {
        'detail': {
          'appURL': url,
          'appManifestUrl': manifestUrl
        }
      }
    ));
  }

  handleSecurAppClosed() {
    this.appOpening = false;
    window.removeEventListener('secure-appclosed', this.handleSecurAppClosed);
  }

  render() {
    this.debug('ready to render: mode:', this.state.mode);
    const { deviceFinancingLockStatus } = this.state;
    const activeLockIndex = {
      'none': null,
      'pocket': <LockmodePocket ref={
           (e) => {
             if (e) {
               this.activeLock = e;
             }
           }
         }
         unlock={this.pocketUnlocked} />,
      'passcode': <Passcode ref={
           (e) => {
             if (e) {
               this.activeLock = e;
             }
           }
         }
         firstLaunch={this.firstLaunch}
         unlock={this.passcodeUnlocked}
         softRightHandler={() => {
           if (!Service.query('isDMLockMode')) {
             this.invokeSecureApp('camera');
           }
         }}
         softLeftHandler={this.invokeSecureApp.bind(this, 'emergency-call')}
      />,
      'remotePasscode': <PasscodeRemoteLock ref={
           (e) => {
             if (e) {
               this.activeLock = e;
             }
           }
         }
         unlock={this.remotePasscodeUnlocked}
         softLeftHandler={this.invokeSecureApp.bind(this, 'emergency-call')}
      />,
      'deviceFinancingLocked': <DeviceFinancingLock ref={
           (e) => {
             if (e) {
               this.activeLock = e;
             }
           }
         }
         lockStatus={deviceFinancingLockStatus}
         softRightHandler={() => {
           Service.request('launchMyMoBill', true);
         }}
         softLeftHandler={this.invokeSecureApp.bind(this, 'emergency-call')}
      />
    };

    const notificationEnabled = this.state.notificationEnabled &&
      this.state.mode === 'pocket';

    const clockClassName = 'passcode' === this.state.mode ? 'in-passcode-mode' : '';
    const hideClockAndSimInfo = this.state.remoteLockEnabled ||
      ('deviceFinancingLocked' === this.state.mode &&
      deviceFinancingLockStatus !== 'inactivation-lock');
    return <div
            id='lockscreen-view'
            role='textbox'
            ref={ c => this.element = c }
            tabIndex={-1}
            onKeyDown={(e) => this.onKeyDown(e)}
            onFocus={this.focus.bind(this)}>
                { !hideClockAndSimInfo ? <SimcardInfo /> : null}
                { !hideClockAndSimInfo ? <Clock ref='clock' className={clockClassName} /> : null}
                <LockscreenNotification ref='notification' enabled={notificationEnabled} />
                <div id='lockscreen-bottom' className={this.state.remoteLockEnabled ? 'has-remote-lock' : ''}>
                  {activeLockIndex[this.state.mode]}
                </div>
            </div>;
  }
}

export default EnhanceAnimation(LockscreenView, 'immediate', 'fade-out');
