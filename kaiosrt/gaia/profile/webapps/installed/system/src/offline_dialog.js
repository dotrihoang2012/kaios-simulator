/* global Service, SettingsObserver, StatusBar, Wifi */
import React from 'react';
import BaseComponent from 'base-component';
import SoftKeyStore from 'soft-key-store';
import * as utils from './util/utils';
import EnhanceAnimation from './enhance_animation';
import '../scss/offline_dialog.scss';

export default class OfflineDialog extends BaseComponent {
  name = 'OfflineDialog';
  SHOW = 0;
  EVENT_PREFIX = 'offline-dialog-';
  lastElement = null;
  FORCE_PENDING = 500;
  appList = [
    window.AppOrigin.getManifestURL('email'), // email
    window.AppOrigin.getManifestURL('kaios-weather'), // weather
    window.AppOrigin.getManifestURL('kaios-news'), // news
    window.AppOrigin.getManifestURL('kaios-plus'), // store
    'https://api.kaiostech.com/apps/manifest/OSlAbgrhLArfT7grf4_N', // gva
    'https://api.kaiostech.com/apps/manifest/oRD8oeYmeYg4fLIwkQPH', // facebook
    'https://api.kaiostech.com/apps/manifest/6x6P4Ap7oCIzOW10hBpm', // youtube
    'https://api.kaiostech.com/apps/manifest/ahLsl7Qj6mqlNCaEdKXv' // whatsapp
  ];
  config = {
    dmDataEnabled: true,
    simConfigDataEnabled: true,
    dmWifiEnabled: true,
    simConfigWifiEnabled: true,
  };
  constructor(props) {
    super(props);
    this.focusIndex = 0;
    this.enabled = true;
    this.wifiButton = true;
    this.dataButton = true;
    this.instanceID = '';
    this.state = {
      active: false
    };
  }

  setHierarchy(value) {
    if (value) {
      if (this.container.contains(document.activeElement)) {
        return;
      }
      this.focus();
    } else {
      // clean up
    }
  }

  focus() {
    this.container.focus();
    this.buttons[this.focusIndex].classList.add('active');
  }

  isActive() {
    return this.state.active;
  }

  componentDidUpdate() {
    if (this.state.active) {
      this.instanceID = Service.query('getTopMostWindow').instanceID;
      if (this.container.scrollHeight > this.container.offsetHeight) {
        this.header.classList.add('hidden');
      }
      this.buttons = this.container.querySelectorAll('.button');
      this.publish('-activated');
      Service.request('focus');
    } else {
      this.instanceID = '';
      this.focusIndex = 0;
      this.publish('-deactivated');
    }
    this.updateSoftKey();
  }

  updateSoftKey() {
    if (this.lastElement && this.lastElement !== this.container) {
      SoftKeyStore.unregister(this.lastElement);
    }
    this.lastElement = this.container;
    if (!this.container) {
      return;
    }
    SoftKeyStore.register({
      left: utils.toL10n('cancel'),
      center: utils.toL10n('select')
    }, this.container);
  }

  componentDidMount() {
    Service.register('show', this);
    Service.register('hide', this);
    Service.request('registerHierarchy', this);
    window.addEventListener('appterminated', this);
    window.addEventListener('activityterminated', this);
    const key = 'get_connected_experience.disabled';
    SettingsObserver.getValue(key).then((value) => {
      this.enabled = !value;
    });
    window.addEventListener('hierarchychanged', this);
    this.initSettingsObserve();
  }

  componentWillUnmount() {
    SoftKeyStore.unregister(this.container);
  }

  clear() {
    this.setState({
      active: false
    });
  }

  clearCheck(evt) {
    let app = evt.detail; // jshint ignore:line
    let instanceID = app && app.instanceID;
    if (instanceID && instanceID === this.instanceID) {
      this.clear();
    }
  }

  _handle_appterminated(evt) {
    this.clearCheck(evt);
  }

  _handle_activityterminated(evt) {
    this.clearCheck(evt);
  }

  isSimRegisted() {
    let simSlots = SIMSlotManager.getSlots();
    for (let index = 0; index < simSlots.length; index++) {
      let simslot = simSlots[index];
      let conn = simslot.conn;
      let voiceConnected = conn.voice && conn.voice.connected;
      let dataConnected = conn.data && conn.data.connected;
      if (!simslot.isAbsent() && !simslot.isLocked() && conn.radioState &&
        (voiceConnected || dataConnected && dataConnected.state === 'registered')) {
        return true;
      }
    }
    return false;
  }

  show(app) {
    if (!this.enabled) {
      return;
    }
    if ((this.dataButton && this.isSimRegisted() || this.wifiButton) &&
      (!app || app.isBrowserOrSearch() ||
      this.appList.includes(app.manifestUrl))) {
      this.timestamp = new Date().getTime();
      this.setState({
        active: true,
      });
    }
  }

  hide() {
    this.setState({
      active: false,
    });
  }

  initSettingsObserve() {
    SettingsObserver.observe('dm.data.settings.ui', 'show', (value) => {
      this.config.dmDataEnabled = value === 'show';
      this.updateButtons();
    });
    SettingsObserver.observe('data.settings.ui', this.SHOW, (value) => {
      this.config.simConfigDataEnabled = value === this.SHOW;
      this.updateButtons();
    });
    SettingsObserver.observe('dm.wifi.settings.ui', 'show', (value) => {
      this.config.dmWifiEnabled = value === 'show';
      this.updateButtons();
    });
    SettingsObserver.observe('wifi.settings.ui', this.SHOW, (value) => {
      this.config.simConfigWifiEnabled = value === this.SHOW;
      this.updateButtons();
    });
  }

  updateButtons() {
    if (this.state.active) {
      this.hide();
    }
    this.dataButton =
      this.config.dmDataEnabled && this.config.simConfigDataEnabled;
    this.wifiButton = navigator.b2g.wifiManager &&
      this.config.dmWifiEnabled && this.config.simConfigWifiEnabled;
  }

  gotoWifiList() {
    this.hide();
    let activity = new WebActivity('configure', {
      target: 'device',
      section: 'wifi-available-networks'
    });
    activity.start();
  }

  onButtonProcess() {
    if (!this.state.active) {
      return;
    }
    let button = this.buttons[this.focusIndex];
    if (button.classList.contains('wifi')) {
      if (!Wifi.wifiEnabled) {
        this.container.classList.add('switching');
        SettingsObserver.setValue([{
          name: 'wifi.enabled',
          value: true
        }]).then(() => {
          this.gotoWifiList();
        });
      } else {
        this.gotoWifiList();
      }
    } else {
      SettingsObserver.setValue([{
        name: 'ril.data.enabled',
        value: true
      }]);
      this.hide();
    }
  }

  onKeyDown(evt) {
    let nextFocusIndex = this.focusIndex;
    switch (evt.key) {
      case 'SoftLeft':
      case 'Backspace':
      case 'EndCall':
        evt.preventDefault();
        evt.stopPropagation();
        this.hide();
        break;
      case 'ArrowDown':
      case 'ArrowUp':
        evt.preventDefault();
        evt.stopPropagation();
        nextFocusIndex = this.buttons.length - this.focusIndex - 1;
        break;
      case 'Enter':
        if (new Date().getTime() - this.timestamp < this.FORCE_PENDING) {
          window.setTimeout(() => {
            this.onButtonProcess();
          }, this.FORCE_PENDING);
        } else {
          this.onButtonProcess();
        }
        evt.preventDefault();
        evt.stopPropagation();
        break;
      default:
        break;
    }
    if (nextFocusIndex !== this.focusIndex) {
      this.buttons[this.focusIndex].classList.remove('active');
      this.buttons[nextFocusIndex].classList.add('active');
      this.focusIndex = nextFocusIndex;
      this.readDom.textContent = this.buttons[nextFocusIndex].textContent;
    }
  }

  render() {
    const _ = window.api.l10n.get;
    const isFullscreen = this.state.active &&
      StatusBar.element.classList.contains('fullscreen');
    const classname = (isFullscreen ? 'fullscreen ' : '') +
      'offline-dialog-container';
    const dataButton = this.dataButton && this.isSimRegisted();
    const wifiButtonId = Service.query('isWifiCertified') ? 'use-wifi' :
      'use-wlan';
    const defaultButtonId = dataButton ? 'use-cellular-data' : wifiButtonId;
    return (
      <div id="offline-dialog" role="region">
        {
          this.state.active ?
            <div
              className={classname}
              tabIndex="-1"
              onKeyDown={(e)=>this.onKeyDown(e)}
              onBlur={() => {this.hide();}}
              ref={(dom)=>{this.container=dom;}}
              role="dialog">
              <div id="offline-readout" ref={(dom)=>{this.readDom=dom;}}>
                {`${_('offline-dialog-content')} ${_(defaultButtonId)}`}
              </div>
              <img src={`${window.AppOrigin.getOrigin('system')}/style/icons/loader.png`} />
              <div
                 className="header icon"
                 ref={(dom)=>{this.header=dom;}}
                 data-icon="browser-offline" />
              <div className="content">
                {_('offline-dialog-content')}
              </div>
              <div className="option-menu">
                {
                  dataButton ?
                    <div className="button p-ul data" data-l10n-id='use-cellular-data'/>
                    : null
                }
                {
                  this.wifiButton ?
                    <div className="button p-ul wifi" data-l10n-id={wifiButtonId}/>
                    : null
                }
              </div>
            </div> : null
        }
      </div>
    );
  }
}
