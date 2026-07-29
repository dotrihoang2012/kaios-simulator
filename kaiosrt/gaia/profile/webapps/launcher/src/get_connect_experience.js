import React from 'react';
import BaseComponent from 'base-component';
import SoftKeyStore from 'soft-key-store';
import Service from 'service';
import { toL10n, sendActivity } from './util/utils';

import '../style/scss/get_connect_experience.scss';

const CONNECT_DYNAMIC_IMG = '../style/images/experience_connected_anim.png';
const DM_SETTING_VALUE = ['show', 'hide', 'gray'];
const SETTING_VALUE = [0, 1, 2];

export default class GetConnectExperience extends BaseComponent {
  name = 'GetConnectExperience';
  constructor(props) {
    super(props);

    this.state = {
      showView: false,
      dataStatus: true,
      wifiStatus: true,
      hideIcon: false,
      step: 'step1',
      activiteButton: 'up'
    };

    this.dmDataSettings = false;
    this.dmWifiSettings = false;
    this.dataSettings = false;
    this.wifiSettings = false;
    this.wifiCertified = false;
    this.experienceStep = 'step1';
    this.currentPanel = 'mainView';

    Service.register('showExperiecnceView', this);
    Service.register('closeExperiecnceView', this);
    Service.registerState('experienceStep', this);
    window.addEventListener('panelChange', this.panelChange);
    DeviceCapabilityManager.get('device.wifi.certified')
      .then((wifiCertified) => {
        this.wifiCertified = !!wifiCertified;
      });
  }

  componentDidMount() {
    SettingsObserver.observe('dm.data.settings.ui', null,
      this['_observe_dm.data.settings.ui']);
    SettingsObserver.observe('dm.wifi.settings.ui', null,
      this['_observe_dm.wifi.settings.ui']);
    SettingsObserver.observe('data.settings.ui', null,
      this['_observe_data.settings.ui']);
    SettingsObserver.observe('wifi.settings.ui', null,
      this['_observe_wifi.settings.ui']);
  }

  componentWillUnmount() {
    SettingsObserver.unobserve('dm.data.settings.ui',
      this['_observe_dm.data.settings.ui']);
    SettingsObserver.unobserve('dm.wifi.settings.ui',
      this['_observe_dm.wifi.settings.ui']);
    SettingsObserver.unobserve('data.settings.ui',
      this['_observe_data.settings.ui']);
    SettingsObserver.unobserve('wifi.settings.ui',
      this['_observe_wifi.settings.ui']);
    Service.unregister('showExperiecnceView', this);
    Service.unregister('closeExperiecnceView', this);
    Service.unregisterState('experienceStep', this);
    window.removeEventListener('panelChange', this.panelChange);
  }

  '_observe_dm.data.settings.ui' = (value) => {
    this.dmDataSettings = value;
    this.updateButtonStatus();
  }

  '_observe_dm.wifi.settings.ui' = (value) => {
    this.dmWifiSettings = value;
    this.updateButtonStatus();
  }

  '_observe_data.settings.ui' = (value) => {
    this.dataSettings = value;
    this.updateButtonStatus();
  }

  '_observe_wifi.settings.ui' = (value) => {
    this.wifiSettings = value;
    this.updateButtonStatus();
  }

  getWifiSettings() {
    return (!this.dmWifiSettings ||
      this.dmWifiSettings === DM_SETTING_VALUE[0]) &&
      (!this.wifiSettings || this.wifiSettings === SETTING_VALUE[0]);
  }

  getDataSetting() {
    return (!this.dmDataSettings ||
      this.dmDataSettings === DM_SETTING_VALUE[0]) &&
      (!this.dataSettings || this.dataSettings === SETTING_VALUE[0]);
  }

  checkLargeFontHeight(dom) {
    if (dom.scrollHeight > dom.offsetHeight) {
      this.setState({
        hideIcon: true
      });
    }
  }

  updateButtonStatus() {
    this.setState({
      dataStatus: this.getDataSetting(),
      wifiStatus: this.getWifiSettings()
    });
  }

  showExperiecnceView() {
    const dataStatus = this.getDataSetting();
    this.setState({
      showView: true,
      dataStatus: dataStatus,
      step: 'step1',
      hideIcon: false,
      activiteButton: dataStatus ? 'up' : 'down'
    }, () => {
      const step1Warp = document.querySelectorAll('.text-warp')[0];
      this.checkLargeFontHeight(step1Warp);
      this.experienceStep = 'step1';
      this.element.focus();
    });
  }

  loadImage() {
    let img = this.element.querySelector('img');
    img.src = CONNECT_DYNAMIC_IMG;
  }

  updateSoftKeys(_keys = { center: 'select', right: '', left: 'cancel' }) {
    SoftKeyStore.register(_keys, this.element);
  }

  panelChange = (evt) => {
    if (evt.detail.panel === 'mainView') {
      this.willShowPage && this.showSecondPage();
    }
  }

  showSecondPage(show) {
    if (this.willShowPage) {
      this.willShowPage = false;
      show = true;
      window.removeEventListener('networkstatuschange', this.netWorkStatusChange);
    }

    if (!show) return;

    if (this.online) {
      this.setState({
        showView: true,
        step: 'step2',
        hideIcon: false,
      }, () => {
        const step2Warp = document.querySelector('.internet-text-warp');
        this.checkLargeFontHeight(step2Warp);
        this.experienceStep = 'step2';
        this.loadImage();
        this.updateSoftKeys({
          left: 'notifications',
          center: 'icon=all-apps',
          right: 'contacts'
        });
        document.body.classList.add('experience-step2');
      });
    } else {
      this.setState({
        showView: true,
        wifiStatus: this.getWifiSettings(),
        step: 'step3',
        hideIcon: false,
      }, () => {
        const step3Warp = document.querySelectorAll('.text-warp')[1];
        this.checkLargeFontHeight(step3Warp);
        this.experienceStep = 'step3';
        this.element.focus();
        Service.request('openSheet', 'experience');
      });
    }
  }

  netWorkStatusChange = (evt) => {
    this.online = evt.detail.online;
    if (Service.query('lastSheet') !== 'mainView') {
      this.willShowPage = true;
    } else {
      this.showSecondPage(true);
      window.removeEventListener('networkstatuschange', this.netWorkStatusChange);
    }
  }

  closeExperiecnceView(val) {
    this.closeView(val);
  }

  closeView(step) {
    if (step && step === 'step1') {
      document.body.classList.remove('experience-step2');
    }
    Service.request('closeSheet', 'experience');
    this.setState({ showView: false, step: step || this.state.step });
  }

  onKeyDown = (evt) => {
    const hasCardsApp = Service.query('hasCardsApp');
    switch (evt.key) {
      case 'ArrowUp':
        if (this.state.activiteButton === 'down' && this.state.dataStatus) {
          if (this.state.step === 'step1' && !hasCardsApp) {
            return;
          }
          this.setState({
            activiteButton: 'up'
          });
        }
        break;
      case 'ArrowDown':
        if (this.state.activiteButton === 'up' && this.state.dataStatus) {
          if (this.state.step === 'step1' && !hasCardsApp) {
            return;
          }
          this.setState({
            activiteButton: 'down'
          });
        }
        break;
      case 'SoftLeft':
      case 'EndCall':
      case 'BrowserBack':
      case 'Backspace':
        this.closeView();
        break;
      case 'Enter':
        if (this.state.step === 'step1') {
          this.closeView();
          if (this.state.activiteButton === 'up') {
            SettingsObserver.getValue('ril.data.enabled')
              .then((value) => {
                if (!value) {
                  SettingsObserver.setValue([{
                    name: 'ril.data.enabled',
                    value: true
                  }]);
                  window.addEventListener('networkstatuschange', this.netWorkStatusChange);
                }
              });
          } else {
            sendActivity({
              name: 'open-card',
              data: {
                id: 'preloaded-3'
              }
            })
            .catch((err) => console.error('Open wifi activity err!', err));
          }
        }

        if (this.state.step === 'step3' && this.state.wifiStatus) {
          this.closeView();
          sendActivity({
            name: 'configure',
            data: {
              target: 'device',
              section: 'wifi'
            }
          })
          .catch((err) => console.error('Open wifi activity err!', err));
        }
        break;
      default:
        break;
    }
  }

  onFocus = () => {
    if (this.state.step === 'step1' || this.state.step === 'step3') {
      this.updateSoftKeys();
    }
  }

  render() {
    const hasCardsApp = Service.query('hasCardsApp');
    const onlineUpClassNames = [
      'up-button',
      this.state.activiteButton === 'up' ? 'activite-button' : '',
      this.state.dataStatus ? '' : 'hidden',
      hasCardsApp ? '' : 'up-button-margin-top'
    ].filter(Boolean).join(' ');
    const onlineDownClassNames = [
      'down-button',
      this.state.activiteButton === 'up' ? 'activite-button' : '',
      hasCardsApp ? '' : 'hidden'
    ].filter(Boolean).join(' ');
    return (
      <div
        id="experience-container"
        tabIndex="-1"
        className={`${this.state.showView ? '' : 'hidden'} ${this.state.step}`}
        onKeyDown={this.onKeyDown}
        onFocus={this.onFocus}
        ref={(node) => { this.element = node; }}
      >
        <section
          id="not-connect-internet"
          className="not-connect-internet"
        >
          <div className="text-warp">
            <div className={`svg-icon online ${this.state.hideIcon ? 'hidden' : ''}`} />
            <div className="experience-text">{toL10n('not-connect-internet-text')}</div>
          </div>
          <div className={onlineUpClassNames}>
            {toL10n('not-connect-internet-up-button')}
          </div>
          <div className={onlineDownClassNames}>
            {toL10n('not-connect-internet-down-button')}
          </div>
        </section>
        <section
          id="connect-internet"
          className="connect-internet"
        >
          <div className="internet-text-warp">
            <img className={`animation-png  ${this.state.hideIcon ? 'hidden' : ''}`} src="" alt="animation-png" />
            <div className="connect-internet-title">{toL10n('connect-internet-title')}</div>
            <div className="experience-text">{toL10n('connect-internet-text')}</div>
          </div>
          <div className="purple-indicator-png" />
        </section>
        <section
          id="not-data-plan"
          className="not-data-plan"
        >
          <div className="text-warp">
            <div className={`svg-icon offline ${this.state.hideIcon ? 'hidden' : ''}`} />
            <div className="experience-text">{toL10n('not-data-plan-text')}</div>
          </div>
          <div className={`down-button activite-button
            ${this.state.wifiStatus ? '' : 'hidden'}`}
          >
            {toL10n(this.wifiCertified ?
              'not-data-plan-down-button-wifi' :
              'not-data-plan-down-button-wlan')}
          </div>
        </section>
      </div>
    );
  }
}
