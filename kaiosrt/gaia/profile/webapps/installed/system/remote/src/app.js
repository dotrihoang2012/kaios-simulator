import React from 'react';
import ReactDOM from 'react-dom';
import BaseComponent from 'base-component';
import DefaultScreen from './default_screen';
import AttentionScreen from './attention_screen';
import '../scss/app.scss';
/* global PowerManager, SettingsObserver */
export default class App extends BaseComponent {
  state = {
    screen: 'default',
    isOn: true,
    timeout: 10000,
    lidOpen: false
  };

  constructor(props) {
    super(props);
    this.sessionInit();
  }

  componentDidMount() {
    this.setupMessageChannel();
    window.addEventListener('logohidden', this);
    window.addEventListener('screenchange', this);
    window.addEventListener('notification', this);
    window.addEventListener('volumechange', this);
  }

  sessionInit() {
    const servicesArray = [
      'settingsService',
      'powerService',
      'timeService'
    ];
    window.libSession.initService(servicesArray).then(()=>{
      SettingsObserver.init();
      window.TimeService.addEventListener('timeChange', () => {
        window.dispatchEvent(new CustomEvent('timechange'));
      });
    });
  }

  postMessage(type) {
    if (this.channel && type) {
      this.channel.postMessage({
        type
      });
    }
  }

  setupMessageChannel() {
    if ('BroadcastChannel' in window) {
      if (!this.channel) {
        this.channel = new BroadcastChannel('ExternalScreen');
      }
      this.postMessage('init');
      this.channel.onmessage = (evt) => {
        if (evt && evt.data && evt.data.type) {
          var event = new CustomEvent(evt.data.type, {detail: evt.data.detail});
          window.dispatchEvent(event);
        }
      };
    }
  }

  _handle_volumechange() {
    if (!this.state.lidOpen) {
      this.turnOn();
    }
  }

  _handle_notification(evt) {
    if (!this.state.lidOpen) {
      if (evt && evt.detail && evt.detail.requireInteraction) {
        this.updateTimeout(true);
      }
      this.turnOn();
    }
  }

  _handle_logohidden() {
    this.setState({screen: 'default'});
    this.setDimTimeout();
  }

  _handle_screenchange(evt) {
    if (evt && evt.detail) {
      var mainScreenEnable = evt.detail.screenEnabled;
      var mainScreenOffBy = evt.detail.screenOffBy;
      var onlyWakeUp = evt.detail.wakeUpExtScreen;

      if (onlyWakeUp) {
        this.turnOn();
        return;
      }

      if (mainScreenEnable) {
        this.setState({ lidOpen: true });
        this.turnOff();
      } else if (mainScreenOffBy === 'flip') {
        this.setState({lidOpen: false});
        this.turnOn();
      }
    }
  }

  setDimTimeout() {
    if (this._timerID) {
      window.clearTimeout(this._timerID);
    }
    this._timerID = window.setTimeout(() => {
      if (!this.state.lidOpen && this.attentionScreen.state.show &&
        this.attentionScreen.state.type !== 'interaction-notice') {
        this.setDimTimeout();
      } else {
        PowerManager.setExtScreenBrightness(20);
        this.setOffTimeout();
      }
    }, this.state.timeout);
  }

  setOffTimeout() {
    this._timerID = window.setTimeout(() => {
      this.turnOff();
      this._timerID = null;
    }, this.props.timeout);
  }

  turnOn() {
    if (!this.state.isOn) {
      PowerManager.setExtScreenEnabled(true);
      this.postMessage('ext-screen-state-update');
      this.setState({isOn: true});
    }

    PowerManager.setExtScreenBrightness(100);
    this.setDimTimeout();
  }

  updateTimeout(hasInteractionNotice) {
    this.setState({
      timeout: hasInteractionNotice ? 50000 : 10000
    });
  }

  turnOff() {
    window.dispatchEvent(new CustomEvent('interaction-notice-hide'));
    this.updateTimeout(false);
    if (this._timerID) {
      window.clearTimeout(this._timerID);
      this._timerID = null;
    }

    if (this.state.isOn) {
      this.setState({isOn: false}, () => {
        // This timeout function is to keep class 'screenoff' saved in external
        // screen before extScreen off.
        setTimeout(() => {
          if (!this.state.isOn) {
            PowerManager.setExtScreenBrightness(0);
            PowerManager.setExtScreenEnabled(false);
            this.postMessage('ext-screen-state-update');
          }
        }, 200);
      });
    }
  }

  render() {
    return (
      <div className={this.state.isOn? '' : 'screenoff'}>
        <DefaultScreen show={this.state.screen === 'default'}/>
        <AttentionScreen ref={(ref) => this.attentionScreen = ref}/>
      </div>
    )
  }
}

ReactDOM.render(<App timeout={10000}/>, document.getElementById('app'));
