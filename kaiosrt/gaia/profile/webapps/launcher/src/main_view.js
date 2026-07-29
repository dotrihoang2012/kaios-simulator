import React from 'react';
import BaseComponent from 'base-component';
import SoftKeyStore from 'soft-key-store';
import Service from 'service';
import Clock from './clock';
import SimCardStatus from './simCardStatus';
import SpeedDialHelper from './speed_dial_helper';
import LaunchStore from './util/launch_store';
import NoticesDialog from './AppNotice/NoticesDialog';
import NetworkHelpers from './util/network-helper';
import forceSettingsName from './Configs/defaultForceSettingsName';
import * as utils from './util/utils';
import '../style/scss/main_view.scss';

const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS = 4 * 24 * 60 * 60 * 1000;
const TWENTY_EIGHT_DAYS = 21 * 24 * 60 * 60 * 1000;

export default class MainView extends BaseComponent {
  name = 'MainView';

  static defaultProps = {
    open: null,
    close: null
  };
  static propTypes = {
    open: React.PropTypes.func,
    close: React.PropTypes.func
  };

  constructor(props) {
    super(props);

    this.keydownRecords = new Map();
    this.longPressDuration = 1500; // ms
    this.mainFocusStatus = false;


    DeviceCapabilityManager.get('device.key.endcall').then((hasEndCallKey) => {
      this.hasEndCallKey = !!hasEndCallKey;
    });
  }

  componentDidMount() {
    Service.register('show', this);
    Service.register('hide', this);
    Service.register('forcedRefresh', this);
    Service.registerState('mainFocusStatus', this);

    SoftKeyStore.register({
      left: 'notifications',
      center: 'icon=all-apps',
      right: 'contacts'
    }, this.element);
    SpeedDialHelper.register(this.element);

    window.addEventListener('unload', this.unloadHandler);
    window.addEventListener('visibilitychange', () => {
      DUMP('Visibilitychange = ' + document.hidden);
      if (!document.hidden && Service.query('lastSheet') === 'mainView') {
        this.showConnectedExperience();
      }
      if (document.hidden) {
        this._shortLongPressActionTriggered = false;
        this._longPressActionTriggered = false;
      } else if (this.getOfflineShow()) {
        NetworkHelpers.offlineChange = false;
        this.showOfflineToaster();
      }
    });
    // Monitor network changes.
    NetworkHelpers.addEventListeners();
    window.addEventListener('networkstatuschange', this.networkstatuschange);

    DUMP('Main view componentDidMount loaded!');
  }

  unloadHandler = () => {
    window.removeEventListener('unload', this.unloadHandler);
    SoftKeyStore.unregister(this.element);
    SpeedDialHelper.unregister(this.element);
    Service.unregister('show', this);
    Service.unregister('hide', this);
    Service.unregister('forcedRefresh', this);
    Service.unregisterState('mainFocusStatus', this);
  }

  onKeyDown = (evt) => {
    if (!Service.query('AppList.ready') || Service.query('LaunchStore.isLaunching')) {
      return;
    }
    let key = evt.key;

    // Hide get connected experience view.
    if (Service.query('experienceStep') === 'step2') {
      Service.request('closeExperiecnceView', 'step1');
    }

    if (this._longPressTimer) {
      return;
    }

    // Record the KEYDOWN timestamp for key-pressing travel time calculation.
    this.keydownRecords.set(key, Date.now());

    // Custom key press.
    const forceSettings = Service.query('forceSettings');
    const keyPressOptions = forceSettings[forceSettingsName[6]];
    if (utils.customEvtentKey(key, keyPressOptions, LaunchStore)) {
      return;
    }

    switch (key) {
      case 'ArrowLeft':
        if (Service.query('Sidemenu.itemCount') > 0) {
          Service.request('openSheet', 'sidemenu');
        }
        break;
      case 'ArrowDown':
        Service.request('setCardsFocus');
        evt.preventDefault();
        evt.stopPropagation();
        break;
      default:
        break;
    }

    this._longPressTimer = setTimeout(() => {
      this.clearLongPressTimer();
      this._longPressActionTriggered = true;
      // Custom long key press.
      const longPressOptions = forceSettings[forceSettingsName[3]];
      if (utils.customEvtentKey(key, longPressOptions, LaunchStore)) {
        return;
      }
      switch (key) {
        // Should only be opened at the time of testing
        /* case 'ArrowDown':
            localStorage.removeItem('tutorial-has-viewed');
            location.reload();
            break; */
        case 'Enter':
          utils.sendActivity({ name: 'voice-assistant',
            data: { from: 'Homescreen' }
          });
          break;
        default:
          this._longPressActionTriggered = false;
          break;
      }
    }, this.longPressDuration);
  };

  onKeyUp = (evt) => {
    let key = evt.key;
    if ((!this._longPressTimer) ||
        Service.query('LaunchStore.isLaunching') ||
        !Service.query('AppList.ready')) {
      return;
    }

    this.clearLongPressTimer();

    if (this._shortLongPressActionTriggered) {
      this._shortLongPressActionTriggered = false;
      return;
    }

    if (this._longPressActionTriggered) {
      this._longPressActionTriggered = false;
      return;
    }

    switch (key) {
      case 'Call':
        if (!this.isValidKeyUp('Call')) { return; }
        LaunchStore.launch('manifestUrl', window.AppOrigin.getManifestURL('communications'));
        break;
      case 'Enter':
        if (!this.isValidKeyUp('Enter')) { return; }
        Service.request('openSheet', 'appList');
        break;
      case 'SoftLeft':
        if (!this.isValidKeyUp('SoftLeft')) { return; }
        Service.request('updateSoftKeyPoint', false);
        break;
      case 'SoftRight':
        if (!this.isValidKeyUp('SoftRight')) { return; }
        LaunchStore.launch('manifestUrl', window.AppOrigin.getManifestURL('contact'));
        break;
      default:
        break;
    }
  };

  /**
   * Validate a KEYUP event by seeing if it was triggered in a pair of
   * KEYDOWN-KEYUP combination, within a tolerable keypress travel time.
   */
  isValidKeyUp = (key) => {
    if (this.keydownRecords.get(key)) {
      const keypressTravelTime = Date.now() - this.keydownRecords.get(key);
      const tolerance = this.longPressDuration;
      return keypressTravelTime < tolerance;
    }
    return false;
  };

  clearLongPressTimer() {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
  }

  show() {
    this.element.classList.remove('hidden');
    this.focus();
  }

  hide() {
    this.element.classList.add('hidden');
  }

  forcedRefresh() {
    this.element.classList.add('to-force-display');
    SoftKeyStore.register({
      left: 'notifications',
      center: 'icon=all-apps',
      right: 'contacts'
    }, this.element);
  }

  focus() {
    this.element.focus();
  }

  setRef = (node) => {
    this.element = node;
  }

  onBlur = () => {
    DUMP('Get main view onblur!');
    this.mainFocusStatus = false;
    this.element.classList.remove('is-focus');
    this.element.classList.remove('to-force-display');
  }

  onFocus = () => {
    DUMP('Get main view onfocus!');
    this.mainFocusStatus = true;
    this.element.classList.add('is-focus');

    if (this.getOfflineShow()) {
      NetworkHelpers.offlineChange = false;
      this.showOfflineToaster();
    }
    this.showConnectedExperience();
  }

  getOfflineShow = () => {
    return !this.getForceSettings() &&
      NetworkHelpers.offlineChange &&
      !document.hidden &&
      this.mainFocusStatus;
  }

  getForceSettings = () => {
    const forceSettings = Service.query('forceSettings');
    return forceSettings && forceSettings[forceSettingsName[1]];
  }

  networkstatuschange = (result) => {
    const connected = result.detail.online;
    const currentPanel = Service.query('lastSheet');
    if (!connected && NetworkHelpers.connected) {
      NetworkHelpers.offlineChange = true;
      if ((!currentPanel || currentPanel === 'mainView') &&
        this.mainFocusStatus &&
        !document.hidden) {
        NetworkHelpers.offlineChange = false;
        this.showOfflineToaster();
      }
    } else if (connected && !NetworkHelpers.connected) {
      NetworkHelpers.offlineChange = false;
    }

    NetworkHelpers.connected = connected;
  }

  showConnectedExperience = () => {
    const isShowExperience = this.getExperienceShow();
    if (isShowExperience) {
      Service.request('openSheet', 'experience');
      Service.request('showExperiecnceView');
    }
  }

  showOfflineToaster = () => {
    Toaster.showToast({
      messageL10nId: 'offline-toaster-message',
      gaiaIcon: 'browser-offline',
      latency: 2800
    });
  }

  getExperienceShow = () => {
    const simStatus = Service.query('simStatus');
    const mainIndex = Service.query('mainSimCardIndex');
    if (this.getForceSettings() ||
      !simStatus.length ||
      simStatus[mainIndex].stateL10nId) {
      return;
    }

    const currentPanel = Service.query('lastSheet');
    return this.mainFocusStatus &&
      currentPanel === 'mainView' &&
      this.computeExperienceRemind() &&
      !NetworkHelpers.connected;
  }

  computeExperienceRemind = () => {
    const experienceLocal = localStorage.getItem('experienceRemind');
    if (!experienceLocal) return;
    const { time, times } = JSON.parse(experienceLocal);
    const difference = Date.now() - time;
    let showRemind = false;
    if (times > 3) return false;

    if ((difference > THREE_DAYS && times === 1) ||
      (difference > SEVEN_DAYS && times === 2) ||
      (difference > TWENTY_EIGHT_DAYS && times === 3)) {
      showRemind = true;
    }

    if (showRemind) {
      utils.setLocalStorage('experienceRemind',
        JSON.stringify({ time: Date.now(), times: times + 1 }));
    }

    return showRemind;
  }

  render() {
    return (
      <div
        id="main-view" tabIndex="-1"
        onKeyDown={this.onKeyDown}
        onKeyUp={this.onKeyUp}
        onFocus={this.onFocus}
        onBlur={this.onBlur}
        ref={this.setRef}
      >
        <SimCardStatus />
        <Clock />
        <NoticesDialog />
      </div>
    );
  }
}
