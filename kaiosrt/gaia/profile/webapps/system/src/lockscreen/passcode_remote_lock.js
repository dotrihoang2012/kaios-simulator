'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import BaseComponent from 'base-component';
import * as utils from '../util/utils';
import '../../scss/lockscreen/passcode.scss';

export default class PasscodeRemoteLock extends BaseComponent {
  name = 'PasscodeRemoteLock';
  DEBUG = false;

  PASSCODE_SIZE = 6;

  static defaultProps = {
    softRightHandler: () => {},
    softLeftHandler: () => {},
    unlock: () => { }
  };

  constructor(props) {
    super(props);
    this.state = {
      remoteMessage: '',
      passcode: '000000',
      currentPasscode: '',
      error: ''
    };
  }

  componentDidMount() {
    this.debug('did mount');
    this['observe_lockscreen.lock-message'] =
      this['_observe_lockscreen.lock-message'].bind(this);
    this['observe_lockscreen.remote-lock'] =
      this['_observe_lockscreen.remote-lock'].bind(this);
    SettingsObserver.observe('lockscreen.lock-message', undefined,
      this['observe_lockscreen.lock-message']);
    SettingsObserver.observe('lockscreen.remote-lock', undefined,
      this['observe_lockscreen.remote-lock']);
    window.addEventListener('screenchange', this);
    window.addEventListener('hierarchytopmostwindowchanged', this);
    window.document.getElementById('screen').classList.add('locked');
  }

  _handle_hierarchytopmostwindowchanged() {
    this.setState({
      currentPasscode: '',
      error: ''
    });
  }

  _handle_screenchange() {
    this.setState({
      currentPasscode: '',
      error: ''
    });
  }

  '_observe_lockscreen.remote-lock'(value) {
    this.debug('_observe_lockscreen.remote-lock:', value);
    if (value) {
      this.setState({
        remoteMessage: value[0],
        passcode: value[1]
      });
    }
  }

  '_observe_lockscreen.lock-message'(value) {
    this.debug('_observe_lockscreen.lock-message:', value);
    if (!value) {
      return;
    }
    this.setState({
      remoteMessage: value
    });
  }

  componentWillUnmount() {
    SettingsObserver.unobserve('lockscreen.remote-lock',
      this['observe_lockscreen.remote-lock']);
    SettingsObserver.unobserve('lockscreen.lock-message',
      this['observe_lockscreen.lock-message']);
    window.removeEventListener('hierarchytopmostwindowchanged', this);
    window.removeEventListener('screenchange', this);
    window.document.getElementById('screen').classList.remove('locked');
  }

  componentDidUpdate() {
    if (this.state.currentPasscode === this.state.passcode) {
      SettingsObserver.setValue([{
        name: 'lockscreen.remote-lock',
        value: ['', '']
      }]);
      this.props.unlock();
    } else if (this.state.currentPasscode.length === this.state.passcode.length) {
      this.setState({
        currentPasscode: '',
        error: 'incorrect'
      });
    } else if (this.state.error && this.state.currentPasscode !== '') {
      this.setState({
        error: ''
      });
    }
  }

  onKeyDown(evt) {
    if (document.hidden) {
      return;
    }
    switch (evt.key) {
      case 'SoftRight':
        this.props.softRightHandler();
        break;
      case 'SoftLeft':
        this.props.softLeftHandler();
        break;
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
      case '0':
        this.setState({
          currentPasscode: this.state.currentPasscode + evt.key
        });
        break;
      case 'Backspace':
        if (this.state.currentPasscode.length) {
          this.setState({
            currentPasscode: this.state.currentPasscode.substr(0, this.state.currentPasscode.length - 1)
          });
        }
        break;
    }
  }

  render() {
    this.debug('render');
    const passcode = this.state.currentPasscode.split('');
    let dom = [];

    for (let i = 0; i < this.PASSCODE_SIZE; i++) {
      const className = (passcode[i] !== undefined) ? 'code dotted' : 'code';
      dom.push(<div className={className} key={i}><div className="dot" /></div>);
    }
    return <div id="remote-passcode-view" className={this.state.error ? 'error' : ''}
      onKeyDown={(e) => this.onKeyDown(e)} tabIndex="-1">
      <p className="header">
        {utils.toL10n("device-locked")}
      </p>
      <p className="remote-message">{this.state.remoteMessage}</p>
      <div className="secondary info-text">
        {utils.toL10n(this.state.error ? "remotelockscreenCheckLockCode" : "enterPIN")}
      </div>
      <div className="codes">
        {dom}
      </div>
    </div>
  }
}
