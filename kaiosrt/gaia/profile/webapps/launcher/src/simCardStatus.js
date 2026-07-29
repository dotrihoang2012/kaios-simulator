/* global emitter */
import React from 'react';
import BaseComponent from 'base-component';
import Service from 'service';
import '../style/scss/simcard.scss';

export default class SimCardStatus extends BaseComponent {
  name = 'SimCardStatus';
  simCardsName = {};
  constructor(props) {
    super(props);
    this.state = {
      isVoWifi: false,
      isAirplaneMode: false,
      cardInfos: []
    };

    this.simStatus = [];
    this.mainSimCardIndex = 0;
  }

  componentDidMount() {
    this._initCardInfos();

    SettingsObserver.observe('airplaneMode.enabled', null,
      this['_observe_custom.simcards.name']);
    SettingsObserver.observe('custom.simcards.name', null,
      this['_observe_airplaneMode.enabled']);
    SettingsObserver.observe('ril.data.defaultServiceId', null,
      this['_observe_ril.data.defaultServiceId']);

    Service.registerState('simStatus', this);
    Service.registerState('mainSimCardIndex', this);
  }

  componentWillUnmount() {
    SettingsObserver.unobserve('airplaneMode.enabled',
      this['_observe_custom.simcards.name']);
    SettingsObserver.unobserve('custom.simcards.name',
      this['_observe_airplaneMode.enabled']);
    SettingsObserver.unobserve('ril.data.defaultServiceId',
      this['_observe_ril.data.defaultServiceId']);
    Service.unregisterState('simStatus', this);
    Service.unregisterState('mainSimCardIndex', this);
    const conns = navigator.b2g.mobileConnections;
    if (conns) {
      Array.from(conns).forEach((conn, index) => {
        if (!window.SIMSlotManager.isSIMCardAbsent(index)) {
          conn.removeEventListener('datachange', this._handle_datachange);
          conn.removeEventListener('voicechange', this._handle_voicechange);
          conn.removeEventListener('signalstrengthchange',
            this._handle_signalstrengthchange);
          let ims = conn.imsHandler;
          ims && ims.removeEventListener('capabilitychange',
            this._handle_capabilitychange);
        }
      });
    }
  }

  '_observe_custom.simcards.name' = (value) => {
    this.simCardsName = value || {};
    this._updateCardInfos();
  }

  '_observe_airplaneMode.enabled' = (value) => {
    this.setState({
      isAirplaneMode: value
    });
  }

  '_observe_ril.data.defaultServiceId' = (value) => {
    this.mainSimCardIndex = value;
  }

  '_handle_simslotready' = () => {
    window.removeEventListener('simslotready', this._handle_simslotready);
    this._initCardInfos();
  }

  '_handle_datachange' = () => {
    this._updateCardInfos();
  }

  '_handle_voicechange' = () => {
    this._updateCardInfos();
  }

  '_handle_capabilitychange' = () => {
    this._updateCardInfos();
  }

  '_handle_signalstrengthchange' = () => {
    this._updateCardInfos();
  }

  _initCardInfos() {
    const conns = navigator.b2g.mobileConnections;
    if (!conns) {
      return;
    }

    if (window.SIMSlotManager.ready) {
      Array.from(conns).forEach((conn, index) => {
        if (!window.SIMSlotManager.isSIMCardAbsent(index)) {
          conn.addEventListener('datachange', this._handle_datachange);
          conn.addEventListener('voicechange', this._handle_voicechange);
          conn.addEventListener('signalstrengthchange',
            this._handle_signalstrengthchange);
          let ims = conn.imsHandler;
          ims && ims.addEventListener('capabilitychange',
            this._handle_capabilitychange);
        }
      });
      this._updateCardInfos();
    } else {
      window.addEventListener('simslotready', this._handle_simslotready);
    }
  }

  _updateCardInfos() {
    const conns = navigator.b2g.mobileConnections;
    if (!conns) {
      return;
    }

    let cardInfos = [];
    const simSlots = window.SIMSlotManager.getSlots();

    Array.from(conns).forEach((conn, index) => {
      const isAbsent = !conn.iccId;

      // Raw signal level from MozMobileConnections is -1~4
      // we normalize it to 0~5 for data-icon convenient
      let signalLevel = 0;
      if ((!isAbsent && conn.voice.connected) ||
        (conn.data && conn.data.state === 'registered')) {
        if (conn.signalStrength) {
          signalLevel = conn.signalStrength.level + 1;
        } else {
          signalLevel = Math.ceil(conn.voice.relSignalStrength / 20);
        }
      }

      let stateL10nId;
      let carrierName;
      let data = conn.data;
      let network;
      let voice_data = conn.voice ? conn.voice : conn.data;
      let ims = conn.imsHandler;
      let isVoWifi = !!ims && (ims.capability === 'voice-over-wifi' ||
        ims.capability === 'video-over-wifi');

      if (conn.voice && conn.voice.connected) {
        network = conn.voice.network;
      } else if (data && data.state === 'registered') {
        network = conn.data.network;
      }
      if (isAbsent) {
        stateL10nId = 'noSimCard';
      } else if (simSlots[index].getCardState() !== 'ready') {
        stateL10nId = 'lockedSim';
      } else if (voice_data.state === 'searching') {
        stateL10nId = 'searching';
      } else if (network || isVoWifi) {
        let iccid = conn.iccId;
        let iccObj = navigator.b2g.iccManager.getIccById(iccid);
        let iccInfo = iccObj ? iccObj.iccInfo : null;
        let operator = network ? network.longName : null;
        if (iccInfo && iccInfo.isDisplaySpnRequired && iccInfo.spn) {
          if (operator && iccInfo.isDisplayNetworkNameRequired &&
            operator !== iccInfo.spn) {
            operator = operator + ' ' + iccInfo.spn;
          } else {
            operator = iccInfo.spn;
          }
        }
        carrierName = this.simCardsName[conn.iccId] || operator;
      } else {
        stateL10nId = 'noService';
      }

      cardInfos.push({
        signalLevel,
        carrierName,
        stateL10nId,
        isVoWifi
      });
    });

    this.simStatus = cardInfos;
    this.setState({ cardInfos });

    emitter.emit('simInfoUpdate');
  }

  render() {
    const isMultiSIM = window.SIMSlotManager.isMultiSIM();

    if (!isMultiSIM) {
      return null;
    }

    if (this.state.isAirplaneMode) {
      let vowifiDom = this.state.cardInfos.map((info, index) => {
        if (info.isVoWifi) {
          return (
            <div>
              <span className="sim-name">{info.carrierName}</span>
              <i data-icon={`sim-${index + 1}`} />
            </div>
          );
        } else {
          return false;
        }
      });

      let airplaneDom = <span data-l10n-id="airplaneMode" />;
      return (
        <div className="sim-card-status airplane-mode">
          <div className="sim-card">
            {(vowifiDom[0] || vowifiDom[1]) ? vowifiDom : airplaneDom}
          </div>
        </div>
      );
    }

    let simDom = this.state.cardInfos.map((info, index) => {
      let signalDom = (
        <div className="sim-icon exist-signal" data-index={`${index + 1}`}>
          <i className="icon-signal" data-icon={`signal-${info.signalLevel}`} />
          <i className="icon-bg" data-icon="signal-5" />
        </div>
      );

      let noSdcard = (
        <div className="sim-icon">
          <i className="icon-nosim" data-icon={`sim-${index + 1}`} />
          <i className="icon-signal" data-icon="signal-0" />
        </div>
      );
      return (
        <div className="sim-card">
          <span className="sim-name" data-l10n-id={info.stateL10nId}>{info.carrierName}</span>
          {['noSimCard', 'noService', 'lockedSim'].includes(info.stateL10nId) ? noSdcard : signalDom}
        </div>
      );
    });

    return (
      <div className="sim-card-status" dir="ltr">
        {simDom}
      </div>
    );
  }
}
