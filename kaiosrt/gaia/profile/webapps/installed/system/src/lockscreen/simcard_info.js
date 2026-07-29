/*global SIMSlotManager */
'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import BaseComponent from 'base-component';
import * as utils from '../util/utils';
import '../../scss/lockscreen/simcard_info.scss';

export default class SimcardInfo extends BaseComponent {
  name = 'SimcardInfo';

  DEBUG = false;
  simCardsName = {};
  showSingleSimOperator = false;
  constructor(props) {
    super(props);
    this.state = {
      isVoWifi: false,
      isAirplaneMode: false,
      cardInfos: []
    };
  }

  componentDidMount() {
    this._initCardInfos();
    this['observe_airplaneMode.enabled'] =
      this['_observe_airplaneMode.enabled'].bind(this);
    this['observe_custom.simcards.name'] =
      this['_observe_custom.simcards.name'].bind(this);
    SettingsObserver.observe('airplaneMode.enabled', undefined,
      this['observe_airplaneMode.enabled']);
    SettingsObserver.observe('custom.simcards.name', undefined,
      this['observe_custom.simcards.name']);
    SettingsObserver.getValue('statusbar.singleSimOperator.enabled').then((value) => {
      this.showSingleSimOperator = (value === false);
    });
  }

  '_observe_custom.simcards.name'(value) {
    this.simCardsName = value || {};
    this._updateCardInfos();
  }

  '_observe_airplaneMode.enabled'(value) {
    this.setState({
      isAirplaneMode: value
    });
  }

  /**
   * Assign event handlers and update cardInfos once
   */
  _initCardInfos(){
    const conns = navigator.b2g.mobileConnections;
    if (!conns) {
      return;
    }

    if (SIMSlotManager.ready) {
      Array.from(conns).forEach( (conn, index) => {
        if (!SIMSlotManager.isSIMCardAbsent(index)) {
          conn.addEventListener('datachange', this);
          conn.addEventListener('voicechange', this);
          conn.addEventListener('signalstrengthchange', this);
          let ims = conn.imsHandler;
          if (ims) {
            ims.addEventListener('capabilitychange', this);
          }
        }
      });
      this._updateCardInfos();
    } else {
      window.addEventListener('simslotready', this);
    }
  }

  componentWillUnmount() {
    SettingsObserver.unobserve('airplaneMode.enabled',
      this['observe_airplaneMode.enabled']);
    SettingsObserver.unobserve('custom.simcards.name',
      this['observe_custom.simcards.name']);
    const conns = navigator.b2g.mobileConnections;
    if (conns) {
      Array.from(conns).forEach( (conn, index) => {
        if (!SIMSlotManager.isSIMCardAbsent(index)) {
          conn.removeEventListener('datachange', this);
          conn.removeEventListener('voicechange', this);
          conn.removeEventListener('signalstrengthchange', this);
          let ims = conn.imsHandler;
          if (ims) {
            ims.removeEventListener('capabilitychange', this);
          }
        }
      });
    }
  }

  /**
   * Update cardInfos by looping all b2g.mobileConnections
   * Object structure in cardInfos:
   * {
   *  signalLevel: 1, // 1~5
   *  carrierName: 'Far EasTone'  // long name
   * }
   */
  _updateCardInfos(){
    const conns = navigator.b2g.mobileConnections;
    if (!conns) {
      return;
    }

    let cardInfos = [];
    const simSlots = SIMSlotManager.getSlots();
    let hasVoWifi = false;
    Array.from(conns).forEach( (conn, index) => {
      const isAbsent = !conn.iccId;
      let isVoWifi = false;

      // Raw signal level from b2g.mobileConnections is -1~4
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

      let stateL10nId, carrierName;
      let data = conn.data;
      let network;
      let voice_data = conn.voice ? conn.voice : conn.data;
      let ims = conn.imsHandler;
      isVoWifi = ims && (ims.capability === 'voice-over-wifi' ||
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
        const iccObj = navigator.b2g.iccManager &&
          navigator.b2g.iccManager.getIccById(iccid);
        let iccInfo = iccObj ? iccObj.iccInfo : null;
        let operator = network ? network.shortName || network.longName : null;
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
      if (isVoWifi) {
        hasVoWifi = true;
      }
      cardInfos.push({
        signalLevel,
        carrierName,
        stateL10nId,
        isVoWifi
      });
    });

    this.setState({ hasVoWifi: hasVoWifi, cardInfos });
  }

  /**
   * Handle mobile connection data change.
   * Just update all card infos.
   */
  '_handle_datachange'(evt) {
    this._updateCardInfos();
  }

  '_handle_voicechange'(evt) {
    this._updateCardInfos();
  }


  '_handle_signalstrengthchange'(evt) {
    this._updateCardInfos();
  }

  '_handle_capabilitychange'(evt) {
    this._updateCardInfos();
  }

  '_handle_simslotready'(evt) {
    window.removeEventListener('simslotready', this);
    this._initCardInfos();
  }

  /**
   * Currently only render information for multi sim card devices
   */
  render() {
    this.debug('Ready to render SimcardInfo');
    const isMultiSIM = SIMSlotManager.isMultiSIM();
    const infoDOMs = !isMultiSIM && !this.showSingleSimOperator ? [] : this.state.cardInfos.map((info, index) => {
      const cardDOM = (
        <div className='icon-wrapper'>
          <div className={info.isVoWifi ? 'icon' : 'icon inactive'} data-icon={isMultiSIM ? `sim-${index+1}` : 'no-sim' }>
            <div className={info.isVoWifi ? 'icon hidden' : 'icon'} data-icon='signal-0' />
          </div>
        </div>
      );

      const signalDOM = (
        <div className='icon-wrapper' data-is-searching={info.stateL10nId === 'searching'}>
          <div className='icon level' data-index={isMultiSIM ? `${index+1}` : ''} data-icon={`signal-${info.signalLevel}`} />
          <div className='icon bg' data-icon={`signal-5`} />
        </div>
      );
      let simDom;
      if (this.state.isAirplaneMode && info.isVoWifi ||
        ['noSimCard', 'noService', 'lockedSim'].includes(info.stateL10nId)) {
        simDom = cardDOM;
      } else {
        simDom = signalDOM;
      }
      const textClass = SIMSlotManager.isSIMCardAbsent(index) ? 'text inactive' : 'text';
      return (
        <div className='info-row' data-is-voWifi-mode={info.isVoWifi} key={index}>
          { simDom }
          <div className='carrier-name secondary'>
            <span className={textClass}>
              {info.stateL10nId ? utils.toL10n(info.stateL10nId) : info.carrierName}
            </span>
          </div>
        </div>
      );
    });

    const apmDOM = !isMultiSIM ? null : (
      <div className='airplane-mode-info'>{utils.toL10n('airplane-mode')}</div>
      );

    return <div id="simcard-info"
      data-is-airplane-mode={this.state.isAirplaneMode}
      data-is-voWifi-mode={this.state.hasVoWifi}>
      {infoDOMs}
      {apmDOM}
    </div>;
  }
}
