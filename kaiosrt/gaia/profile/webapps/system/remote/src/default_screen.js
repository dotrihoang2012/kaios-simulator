import React from 'react';
import BaseComponent from 'base-component';
/* global SIMSlotManager*/
class StatusBar extends BaseComponent {
  state = {
    signalCarrierChanged: false,
    level: 10,
    charging: false
  };

  constructor() {
    super();
    navigator.getBattery().then(battery => {
      this._battery = battery
      this._battery.addEventListener('chargingchange', this);
      this._battery.addEventListener('levelchange', this);
      this._battery.addEventListener('statuschange', this);
      this.updateBatteryInfo();
    });
  }

  componentDidMount() {
    this.addConnectionsListeners();
    if (this._battery) {
      this.updateBatteryInfo();
    }

    window.addEventListener('audiochange',
      this.handleAudiochange.bind(this));
  }

  handleAudiochange(evt) {
    if (evt && evt.detail) {
      let active = evt.detail.active;
      if (active) {
        this.audioPlay.classList.remove('hidden');
      } else {
        this.audioPlay.classList.add('hidden');
      }
    }
  }

  updateBatteryInfo() {
    let battery = this._battery;
    let level = Math.ceil((battery.level * 100 - 5) / 10);

    if (this.state.level === level &&
      this.state.charging === battery.charging) {
      return;
    }
    this.setState({level: level, charging: battery.charging});
  }

  getCarrierName() {
    const isRegularMode = SIMSlotManager.hasOnlyOneSIMCardDetected();
    const simSlots = SIMSlotManager.getSlots();
    if (isRegularMode) {
      for (let i = simSlots.length - 1; i >= 0; i--) {
        const simslot = simSlots[i];
        if (!simslot.isAbsent()) {
          const voice = simslot.conn.voice;
          if (voice) {
            const network = voice.network;
            const state = voice.state;
            if (state && state === 'registered') {
              return network ? (network.shortName || network.longName) : '';
            }
          }
        }
      }
    }
    return '';
  }

  handleEvent(evt) {
    switch (evt.type) {
      case 'chargingchange':
      case 'levelchange':
      case 'statuschange':
        this.updateBatteryInfo();
        break;
      case 'voicechange':
      case 'datachange':
      case 'signalstrengthchange':
        this.setState({ signalCarrierChanged: true });
        break;
      default:
        break;
    }
  }

  getSignalElement() {
    const isRegularMode = SIMSlotManager.hasOnlyOneSIMCardDetected();
    const multipleSims = SIMSlotManager.isMultiSIM() && !isRegularMode;
    const simSlots = SIMSlotManager.getSlots();
    const dom = [];
    for (let i = simSlots.length - 1; i >= 0; i--) {
      const simslot = simSlots[i];
      const conn = simslot.conn;
      const voice = conn.voice;
      const data = conn.data;
      const voiceConnected = voice && voice.connected;
      const dataConnected = data && data.connected;
      const hasActiveCall = this.hasActiveCall();
      const index = i + 1;
      const key = `sim-${i}`;
      if (!voice ||
        (conn.radioState !== 'enabled' && conn.radioState !== 'enabling')) {
        continue;
      }
      let element = null;
      let level = null;
      if (simslot.isAbsent()) {
        if (simSlots.length > 1 && isRegularMode) {
          continue;
        }
        element =
          <div
            key={key}
            className="sb-icon-signal"
            data-icon={multipleSims ? 'sim-' + index : "no-sim"}
          >
          </div>
      } else if (dataConnected && data.type && data.type.startsWith('evdo')) {
        if (conn.signalStrength) {
          // signalStrength.level range: 0-4 as normal case
          // -1 is a special case for out-of-serivce.
          // level icon range: 1-5
          level = conn.signalStrength.level + 1;
        } else {
          level = Math.ceil(data.relSignalStrength / 20); // 0-5
        }
        element =
          <div
            key={key}
            className="sb-icon-signal"
            data-level={level}
            data-icon={multipleSims ? 'sim-' + index : ''}
          >
            <div
              className="sb-icon-signal-bg"
              data-index= {multipleSims ? index : ''}
              data-icon="signal-5">
            </div>
          </div>
      } else if (simslot.isLocked()) {
        continue;
      } else if (conn.radioState &&
        (voiceConnected || data && data.state === 'registered' ||
          hasActiveCall && navigator.b2g.telephony.active.serviceId === i)) {
        // If voice.connected is false but there is an active call, we should
        // check whether the service id of that call equals the current index
        // of the target sim card. If yes, that means the user is making an
        // emergency call using the target sim card. In such case we should
        // also display the signal bar as the normal cases.
        if (conn.signalStrength) {
          // signalStrength.level range: 0-4 as normal case
          // -1 is a special case for out-of-serivce.
          // level icon range: 1-5
          level = conn.signalStrength.level + 1;
        } else {
          level = Math.ceil(data.relSignalStrength / 20); // 0-5
        }
        element =
          <div
            key={key}
            className="sb-icon-signal"
            data-level={level}
            data-icon={multipleSims ? 'sim-' + index : ''}
          >
            <div
              className="sb-icon-signal-bg"
              data-index= {multipleSims ? index : ''}
              data-icon="signal-5">
            </div>
          </div>
      } else {
        // "No Network" / "Emergency Calls Only (REASON)" / trying to connect
        // emergencyCallsOnly is always true if voice.connected is false. Show
        // searching icon if the device is searching. Or show the signal bars
        // with a red "x", which stands for emergency calls only.
        element =
          <div
            key={key}
            className="sb-icon-signal"
            data-level={0}
            data-searching ={voice.state === 'searching'}
            data-icon={multipleSims ? 'sim-' + index : ''}
          >
            <div
              className="sb-icon-signal-bg"
              data-index= {multipleSims ? index : ''}
              data-icon="signal-5">
            </div>
          </div>
      }
      dom.push(element);
    }
    return dom;
  }

  hasActiveCall() {
    const telephony = navigator.b2g.telephony;
    // will return true as soon as we begin dialing
    return !!(telephony && telephony.active);
  }

  /**
   * Add event listeners associated with mobile connection state.
   */
  addConnectionsListeners() {
    const conns = navigator.b2g.mobileConnections;
    if (conns) {
      Array.from(conns).forEach(
        (conn) => {
          conn.addEventListener('voicechange', this);
          conn.addEventListener('datachange', this);
          conn.addEventListener('signalstrengthchange', this);
        }
      );
    }
  }

  render() {
    let batteryBaseDataIcon =
      this.state.charging ? 'battery-charging' : 'battery-0';
    let batteryLevelDataIcon =
      (this.state.level > 0) ? 'battery-' + this.state.level : '';
    return (
      <div id="remote-statusbar">
        <div className="statusbar-left">
         {this.getSignalElement()}
          <div id="carrier-info">
            {this.getCarrierName()}
          </div>
        </div>
        <div className="statusbar-right">
          <div
            id="audio-play"
            className="hidden"
            ref={(ref) => this.audioPlay = ref}>
            <span data-icon="play"/>
          </div>
          <div id="battery-info" className="sb-icon sb-icon-battery"
               ref={(ref) => this.batteryInfo = ref}>
            <span
              className="battery-icon-level"
              data-level={this.state.level}
              data-icon={batteryLevelDataIcon}
              data-charging={this.state.charging}
            />
            <span
              className="battery-icon-base"
              data-icon={batteryBaseDataIcon}
            />
          </div>
        </div>
      </div>
    )
  }
}

class Clock extends BaseComponent {
  state = {
    ampm: 'am',
    time: [1, 0, 0, 0]
  };

  _date = '';

  constructor() {
    super();
  }

  componentDidMount() {
    this.start();

    window.addEventListener('screenchange', this);
    window.addEventListener('timechange', this);
    window.addEventListener('timeformatchange', this);
  }

  handleEvent(evt) {
    switch (evt.type) {
      case 'screenchange':
      case 'timechange':
      case 'timeformatchange':
        this.stop();
        this.start();
        break;

      default:
        break;
     }
   }

  start() {
    this.refresh();
    let now = new Date();
    this.timeoutHandle = setTimeout(() => {
      this.refresh();
      this.timer = setInterval(() => {
        this.refresh();
      }, 60000);
    }, (60 - now.getSeconds()) * 1000);
  }

  stop() {
    if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
    if (this.timer) clearInterval(this.timer);
    this.timeoutHandle = null;
    this.timer = null;
  }

  updateDate() {
    let now = new Date();
    let f = new window.api.l10n.DateTimeFormat();
    let ampmFormat = '%p';
    let timeFormat = window.api.hour12 ? '%I%M' : '%H%M';
    let dateFormat = '%a, %b %d';
    let ampm = window.api.hour12 ? f.localeFormat(now, ampmFormat) : '';
    let time = ('0' + f.localeFormat(now, timeFormat)).slice(-4).split('');
    let date = f.localeFormat(now, dateFormat);
    this.setState({ampm: ampm, time: time});
    if (date !== this._date) {
      this._date = date;
      this.props.onDateUpdate(date);
    }
  }

  refresh() {
    if (window.api.l10n.readyState === 'complete') {
      this.updateDate();
    } else {
      window.api.l10n.once(() => {
        this.updateDate();
      });
    }
  }

  render() {
    let digits = [];
    let time = this.state.time;
    for (let i = 0, len = time.length; i < len; i++) {
      let className = 'clock-icon-box box' + i;
      let dataIconName = 'numeric_' + time[i] + '_rounded_semibold';
      let key = `clock-num${i}`;
      digits.push(<div
        key={key}
        className={className}
        data-icon={dataIconName}
      />);
      if (i === 1) {
        digits.push(<div key='colon' className='clock-colon'/>);
      }
    }
    return (
      <div id="default-screen-time-container">
        <div id="default-screen-ampm" className="screen-text">
          {this.state.ampm}
        </div>
        <div id="default-screen-time">
          {digits}
        </div>
      </div>
    )
  }
}

class SecondaryInfo extends BaseComponent {
  state = {
    info: 'date',
    missingCall: 0,
    showNotice: false,
    unreadNotification: 0
  };

  constructor(props) {
    super(props);

    navigator.b2g.getFlipManager && navigator.b2g.getFlipManager()
      .then(fm => this._flipManager = fm);
  }

  componentDidMount() {
    window.addEventListener('screenchange', this);
    window.addEventListener('missingcall', this);
    window.addEventListener('updatenotificationcount', this);
    window.addEventListener('noticepreviewenabled', this);
  }

  _handle_screenchange(evt) {
    // Every time we close flip
    if (!this._flipManager.flipOpened &&
        !evt.detail.wakeUpExtScreen) {
      this.setState({
        missingCall: 0,
        info: this.state.unreadNotification ? 'status' : 'date'
      });
    }
  }

  _handle_noticepreviewenabled(evt) {
    this.setState({
      showNotice: evt.detail
    });
  }

  _handle_missingcall() {
    this.setState({
      info: 'status',
      missingCall: this.state.missingCall + 1
    });
  }

  _handle_updatenotificationcount(evt) {
    let count = evt.detail.count ? evt.detail.count : 0;
    this.setState({
      unreadNotification: count,
      read: evt.detail.read,
      info: (count || this.state.missingCall) ?
        'status' : 'date'
    });
  }

  render() {
    let dateClass = 'screen-text';
    let missingCallClass, unreadNotificationClass;
    if (!this.state.showNotice || this.state.info !== 'status') {
      missingCallClass = unreadNotificationClass = 'icon-box hide';
    } else {
      dateClass = 'screen-text hide';
      missingCallClass = 'icon-box ' +
        ((this.state.missingCall > 0) ? '' : 'hide');
      unreadNotificationClass = 'icon-box ' +
        ((this.state.unreadNotification > 0) ? '' : 'hide');
    }
    let missedCallNumber =
      this.state.missingCall > 99 ? 99 : this.state.missingCall;
    let unreadNotificationNumber = this.state.unreadNotification > 99 ?
      '...' : this.state.unreadNotification;
    let className = this.state.read ? 'read' : '';
    return (
      <div id="secondary-info-bar">
        <div id="default-screen-date" className={dateClass}>
          {this.props.date}
        </div>
        <div id="status-icons" className="">
          <div className={missingCallClass}>
            <span id="missing-call-icon" data-icon={'phone'}/>
            <span id="missing-call-number">{missedCallNumber}</span>
          </div>
          <div className={unreadNotificationClass}>
            <div id="unread-notification-number-box" className={className}>
              {unreadNotificationNumber}
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default class DefaultScreen extends BaseComponent {
  state = {
    date: 'Mon, Oct 1'
  };

  updateDate = (date) => {
    this.setState({date: date});
  };

  componentDidMount() {
    // initiative get the wallpaper once when boot up.
    if ('BroadcastChannel' in window) {
      let bc = new BroadcastChannel('ExternalScreen');
      bc.postMessage({type: 'getwallpaper'});
      bc.close();
    }
    window.addEventListener('initwallpaper', this);
    window.addEventListener('wallpaperchange', this);
  }


  handleEvent(evt) {
    if (evt && evt.detail && evt.detail.url) {
      this.screen.style.backgroundImage = 'url(' + evt.detail.url + ')';
    }
  }

  render() {
    let className = 'screen' + (this.props.show ? ' show' : '');
    return (
      <div
        id='default-screen'
        className={className}
        ref={(dom)=>{this.screen=dom}}
      >
        <div id='default-screen-gray-mask' />
        <StatusBar />
        <Clock onDateUpdate={this.updateDate} />
        <SecondaryInfo date={this.state.date} />
      </div>
    )
  }
}
