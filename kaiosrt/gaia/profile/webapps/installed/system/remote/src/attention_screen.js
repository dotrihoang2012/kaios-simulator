import React from 'react';
import BaseComponent from 'base-component';

class Notification extends BaseComponent {
  static TYPE = {
    ALERT         : 'alert',
    INCOMING_CALL : 'call-incoming',
    ALARM         : 'alarm',
    BLUETOOTH     : 'bluetooth',
    NOTICE        : 'notice',
    SILENT        : 'mute',
    VIBRATE       : 'vibrate',
    VOLUME        : 'volume',
    INTERACTION_NOTICE : 'interaction-notice'
  };

  constructor(props) {
    super(props)
  }

  getIconDom() {
    let { icon, type } = this.props;
    let iconDOM = '';
    switch (type) {
      case Notification.TYPE.NOTICE:
      case Notification.TYPE.INTERACTION_NOTICE:
        var noticeIcon = icon.split('?')[0].split('/').reverse()[0];
        // Not blob:xxxx or 'data:image/png;base64,xxxxx or xxxx.xxx or
        // xxxxxxxx?xxxx, use gaia-icon
        if (icon && !icon.includes('blob:') &&
          !icon.includes('data:') && !noticeIcon.includes('.')) {
          iconDOM = <div id="notification-icon" data-icon={noticeIcon} />;
        } else {
          iconDOM = <img id="notification-icon" alt="" src={icon} />;
        }
        break;
      case Notification.TYPE.INCOMING_CALL:
        iconDOM = <img id="notification-icon" alt="" src={icon} />;
        break;
      case Notification.TYPE.ALARM:
        icon = 'style/icons/alarm_112.png';
        iconDOM = <img id="notification-icon" alt="" src={icon} />;
        break;
      case Notification.TYPE.BLUETOOTH:
        icon = 'style/bluetooth_transfer/images/icon_bluetooth.png';
        iconDOM = <img id="notification-icon" alt="" src={icon} />;
        break;
      default:
        iconDOM = <div id="notification-icon" data-icon={type} />;
        break;
    }
    return iconDOM;
  }

  render() {
    const className = 'screen show ' + this.props.type;
    const iconDOM = this.getIconDom();
    return (
      <div id="notification-screen" className={className}>
        {iconDOM}
        <div id="notification-primary-text">{this.props.primary}</div>
      </div>
    )
  }
}

class Volume extends BaseComponent {
  constructor(props) {
    super(props);
  }

  componentDidUpdate() {
    // Fail to set attributes directly in ReactDOM when combing
    // with web components, so update value later in this callback.
    if (this.slider.max !== this.props.max) {
      this.slider.setRange(0, this.props.max);
    }
    this.slider.value = this._value;
    // This noborder attribute define in gaia-slider.js. When we load html
    // it not usefull by set data-no-border attributes in ReactDom directly.
    // Because gaia-slider is self define element, it allways get the data-*
    // attribute or Class before we load this ReactDOM. So add an attrs
    // in gaia-slider, and listen the value change, so we can trigger something
    // by set func in this callback.
    this.slider.noborder = 'true';
  }

  render() {
    this._value = this.props.value;
    if (this._value > this.props.max) {
      this._value = this.props.max;
    } else if (this._value < 0) {
      this._value = 0;
    }
    const volumeStatus = this._value + '/' + this.props.max;
    const className = 'screen volume ' + (this.props.show ? 'show' : '');
    return (
      <div id="volume" className={className} key="volume">
        <gaia-slider ref={(ref) => this.slider = ref}/>
        <div className="volume-info-context " >
          <div id="volume-status-text" className="volume-text">
            {volumeStatus}
          </div>
          <div id="volume-primary-text" className="volume-text">
            {this.props.channel}
          </div>
        </div>
      </div>
    )
  }
}

export default class AttentionScreen extends BaseComponent {
  typeL10nMap = {
    'communications': {
      titleId: 'notice-call-title'
    },
    'sms': {
      titleId: 'notice-message-title'
    },
    'calendar': {
      titleId: 'notice-calendar-title'
    },
    'other': {
      titleId: 'notice-other-title'
    }
  };

  state = {
    show: false,
    type: Notification.TYPE.VOLUME,
    primary: 'Mute',
    value: 7,
    max: 10,
    showNotice: false,
    showContent: false,
    icon: '',
    channel: 'notification'
  };
  attentionWindows = [];
  noticesState = {};

  constructor() {
    super();
    Object.keys(Notification.TYPE).forEach((type) => {
      this.noticesState[Notification.TYPE[type]] = {
        show: false,
        icon: null,
        primary: null,
        timeoutId: 0,
      };
    });
    this.noticesState[Notification.TYPE.VOLUME] = {
      show: false,
      timeoutId: 0
    };
  }

  componentDidMount() {
    window.addEventListener('incomingcall', this);
    window.addEventListener('notification', this);
    window.addEventListener('volumechange', this);
    window.addEventListener('systemattention', this);
    window.addEventListener('noticepreviewenabled', this);
    window.addEventListener('noticecontentshow', this);
    window.addEventListener('interaction-notice-hide', this);
  }

  '_handle_interaction-notice-hide'() {
    this.setState({
      show: false,
      type: Notification.TYPE.INTERACTION_NOTICE
    });
  }

  _handle_noticepreviewenabled(evt) {
    this.setState({
      showNotice: evt.detail
    });
  }

  _handle_noticecontentshow(evt) {
    this.setState({
      showContent: evt.detail
    });
  }

  _handle_systemattention(evt) {
    const manifestURL = evt.detail.manifestUrl;
    if (manifestURL === window.AppOrigin.getManifestURL('clock')) {
      switch (evt.detail.type) {
        case 'launch': {
            let hour12 = window.api.hour12;
            let now = new Date();
            let f = new window.api.l10n.DateTimeFormat();
            let ampmFormat = '%p';
            let timeFormat = hour12 ? '%I:%M' : '%H:%M';
            let ampm = hour12 ? ' ' + f.localeFormat(now, ampmFormat) : '';
            let time = f.localeFormat(now, timeFormat);

            this.setState({
              show: true,
              type: Notification.TYPE.ALARM,
              primary: time + ampm
            });
          }
          break;
        case 'close':
          this.setState({
            show: false,
            type: Notification.TYPE.ALARM
          });
          break;
        default:
          break;
      }
    } else if (manifestURL ===
      window.AppOrigin.getManifestURL('network-alerts')) {
      switch (evt.detail.type) {
        case 'launch':
          this.setState({
            show: true,
            type: Notification.TYPE.ALERT,
            primary: window.api.l10n.get('ext-new-cmas')
          });
          break;
        case 'close':
          this.setState({show: false, type: Notification.TYPE.ALERT});
          break;
        default:
          break;
      }
    } else if (manifestURL ===
      window.AppOrigin.getManifestURL('bluetooth')) {
      switch (evt.detail.type) {
        case 'launch':
          this.setState({
            show: true,
            type: Notification.TYPE.BLUETOOTH,
            primary: window.api.l10n.get('ext-bluetooth-req')
          });
          break;
        case 'close':
          this.setState({show: false, type: Notification.TYPE.BLUETOOTH});
          break;
        default:
          break;
      }
    }
  }

  _handle_incomingcall(evt) {
    if (evt && evt.detail) {
      const { detail } = evt;
      if (detail.alert) {
        this.setState({
          show: true,
          type: Notification.TYPE.INCOMING_CALL,
          icon: detail.icon,
          primary: detail.name ? detail.name :
            (detail.number ? detail.number : 'Unknown')
        })
      } else {
        this.setState({
          show: false,
          type: Notification.TYPE.INCOMING_CALL
        });
        window.dispatchEvent(new CustomEvent('missingcall'));
      }
    }
  }

  convertNoticeContent(detail) {
    let result = {
      title: detail.title
    };

    if (!this.state.showContent) {
      const _ = window.api.l10n.get;
      const appsNameArray = ['communications', 'sms', 'calendar'];
      result.title = _(this.typeL10nMap['other'].titleId);
      if (detail.manifestURL) {
        const findAppName = appsNameArray.find(appName => {
          return window.AppOrigin.getManifestURL(appName) ===
            detail.manifestURL;
        });
        if (findAppName) {
          result.title = _(this.typeL10nMap[findAppName].titleId);
        }
      }
    }
    return result;
  }

  _handle_notification(evt) {
    if (evt && evt.detail) {
      const type = evt.detail.requireInteraction
        ? Notification.TYPE.INTERACTION_NOTICE : Notification.TYPE.NOTICE;
      let SHOW_INTERVAL = 3000;
      if (this.state.showNotice) {
        this.setState({
          show: true,
          type,
          icon: evt.detail.icon || evt.detail.appIcon,
          primary: this.convertNoticeContent(evt.detail).title
        });
      }
      if (type !== Notification.TYPE.INTERACTION_NOTICE) {
        this.timeOut(type, SHOW_INTERVAL);
      }
    }
  }

  _handle_volumechange(evt) {
    if (evt && evt.detail) {
      const _ = window.api.l10n.get;
      const { volume, max } = evt.detail;
      let type = Notification.TYPE.VOLUME;
      let primaryString = '';

      if (volume > 0) {
        type = Notification.TYPE.VOLUME;
      } else if (volume === 0 && evt.detail.channel === 'notification') {
        type = Notification.TYPE.VIBRATE;
        primaryString = _('vibrate-only');
      } else {
        type = Notification.TYPE.SILENT;
        if (evt.detail.channel === 'notification') {
          primaryString = _('silent');
        } else {
          primaryString = _('mute');
        }
      }

      const id = 'ext-volume-' + evt.detail.channel;
      const channel = _(id);
      this.setState({
        show: true,
        type,
        max,
        channel,
        primary: primaryString,
        value: volume
      });
      this.timeOut(type, 2000);
    }
  }

  timeOut(type, interval) {
    const noticeState = this.noticesState[type];
    if (noticeState.timeoutId) {
      window.clearTimeout(noticeState.timeoutId);
      noticeState.timeoutId = 0;
    }
    noticeState.timeoutId = window.setTimeout(() => {
      this.setState({ show: false, type: type });
      this.noticesState[type].timeoutId = 0;
    }, interval);
  }

  updateNoticationsState() {
    const { show, type, icon, primary } = this.state;
    if (type === Notification.TYPE.INCOMING_CALL ||
      type === Notification.TYPE.ALARM ||
      type === Notification.TYPE.BLUETOOTH) {
      let findIndex =
        this.attentionWindows.findIndex(windowType => type === windowType);
      if (findIndex !== -1) {
        this.attentionWindows.splice(findIndex, 1);
      }
      if (show) {
        this.attentionWindows.push(type);
      }
    }
    const noticeState = this.noticesState[type];
    if (show) {
      if (type === Notification.TYPE.VOLUME ||
        type === Notification.TYPE.VIBRATE) {
        this.noticesState[Notification.TYPE.SILENT].show = false;
      }
      if (type === Notification.TYPE.VOLUME ||
        type === Notification.TYPE.SILENT) {
        this.noticesState[Notification.TYPE.VIBRATE].show = false;
      }
    }
    if (noticeState) {
      noticeState.show = show;
      noticeState.icon = icon;
      noticeState.primary = primary;
    }
  }

  getNotificationDom() {
    let type = '';
    const notificationDom = [];
    if (this.noticesState[Notification.TYPE.ALERT].show) {
      type = Notification.TYPE.ALERT;
    } else if (this.attentionWindows.length) {
      type = this.attentionWindows[this.attentionWindows.length - 1];
    } else {
      Object.keys(Notification.TYPE).forEach((noticeType) => {
        if (!type && this.noticesState[Notification.TYPE[noticeType]].show) {
          type = Notification.TYPE[noticeType];
        }
      });
    }
    if (type) {
      const noticeState = this.noticesState[type];
      if (type !== Notification.TYPE.VOLUME) {
        const node =
          <Notification
            key={type}
            type={type}
            icon={noticeState.icon}
            primary={noticeState.primary}
          />;
        notificationDom.push(node);
      }
    }
    return notificationDom;
  }

  render() {
    this.updateNoticationsState();
    const notification = this.getNotificationDom();
    const volumeShow =
      !notification.length && this.noticesState[Notification.TYPE.VOLUME].show;
    return (
      <div>
        {notification}
        <Volume
          show={volumeShow}
          value={this.state.value}
          max={this.state.max}
          channel={this.state.channel}
        />;
      </div>
    )
  }
}
