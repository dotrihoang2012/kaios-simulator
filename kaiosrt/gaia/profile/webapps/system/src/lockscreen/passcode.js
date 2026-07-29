'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import BaseComponent from 'base-component';

import * as utils from '../util/utils';

import '../../scss/lockscreen/passcode.scss';

export default class Passcode extends BaseComponent {
  name = 'Passcode';
  DEBUG = false;

  PASSCODE_SIZE = 4;

  VALIDING_TIMEOUT = 300;
  ERROR_STATE_TIMEOUT = 1500;
  COLD_DOWN_INTERVAL = 1000;

  qwertyKeyMapping = {
    'w': '1', 'e': '2', 'r': '3', 's': '4', 'd': '5',
    'f': '6', 'z': '7', 'x': '8', 'c': '9', ',': '0'
  };

  coldDownMapping = [
    0, 0, 0, 0, 0, 0, 60, 180, 300, 600, 900
  ];

  coldDownHandle = null;
  timePassed = 0;

  static defaultProps = {
    softRightHandler: () => {},
    softLeftHandler: () => {},
    unlock: () => {}
  }

  constructor(props) {
    super(props);
    this.state = {
      passcode: '0000',
      currentPasscode: '',
      error: '',
      errorTimes: 0,
      retryTimestamp: 0,
      coldDown: false,
      validing: false
    };

    this.loadSettingsValue();
  }

  /**
   * Set closed/opened listeners once mounted
   */
  componentDidMount() {
    this.debug('did mount, should be locked by passcode');
    this.element = ReactDOM.findDOMNode(this);
    this['observe_lockscreen.passcode-lock.code'] =
      this['_observe_lockscreen.passcode-lock.code'].bind(this);
    this['observe_lockscreen.wrong.code.info'] =
      this['_observe_lockscreen.wrong.code.info'].bind(this);
    SettingsObserver.observe('lockscreen.passcode-lock.code', undefined,
      this['observe_lockscreen.passcode-lock.code']);
    SettingsObserver.observe('lockscreen.wrong.code.info', undefined,
      this['observe_lockscreen.wrong.code.info']);
    window.addEventListener('screenchange', this);
    window.addEventListener('hierarchytopmostwindowchanged', this);
    window.document.getElementById('screen').classList.add('locked');
  }

  _handle_hierarchytopmostwindowchanged() {
    if (!this.state.validing) {
      this.setState({
        validing: false,
        currentPasscode: '',
        error: ''
      });
    }
  }

  _handle_screenchange() {
    if (!this.state.validing) {
      this.setState({
        validing: false,
        currentPasscode: '',
        error: ''
      });
    }
  }

  /**
   * Store user set passcode in state
   */
  '_observe_lockscreen.passcode-lock.code'(value) {
    this.debug('passcode change observed:');
    this.setState({
      passcode: value
    });
  }

  '_observe_lockscreen.wrong.code.info'(value) {
    const { errorTimes, retryTimestamp } = this.state;
    if (value && value.errorTimes) {
      if (value.errorTimes !== errorTimes ||
        value.retryTimestamp !== retryTimestamp) {
        if (value.errorTimes === errorTimes) {
          const oldTime = this.timePassed * 1000 + retryTimestamp;
          if (Math.abs(oldTime - value.retryTimestamp) < 5000) {
            SettingsObserver.setValue([{
              name: 'lockscreen.wrong.code.info',
              value: {
                errorTimes,
                retryTimestamp
              }
            }]);
            return;
          }
        }
        const coldDown = !!this.getColdDownTime(value.errorTimes);
        this.setState({
          coldDown,
          errorTimes: value.errorTimes,
          retryTimestamp: value.retryTimestamp,
          validing: !!coldDown,
          error: coldDown ? 'incorrect' : '',
          currentPasscode: coldDown ? 'lockInput' : ''
        });
      }
    } else if (errorTimes) {
      this.setState({
        errorTimes: 0,
        retryTimestamp: 0,
        currentPasscode: '',
        validing: false,
        error: '',
        coldDown: false
      });
    }
  }

  updateColdDownInfo() {
    if (!this.state.coldDown && this.coldDownHandle) {
      window.clearInterval(this.coldDownHandle);
      this.coldDownHandle = null;
    }
    if (this.state.coldDown && !this.coldDownHandle) {
      this.coldDownHandle = setInterval(() => {
        this.setState({
          coldDown: true
        });
      }, this.COLD_DOWN_INTERVAL);
    }
  }


  componentWillUnmount() {
    this.debug('will unmount: remove observer:');
    SettingsObserver.unobserve('lockscreen.passcode-lock.code',
      this['observe_lockscreen.passcode-lock.code']);
    SettingsObserver.unobserve('lockscreen.wrong.code.info',
      this['observe_lockscreen.wrong.code.info']);
    window.removeEventListener('hierarchytopmostwindowchanged', this);
    window.removeEventListener('screenchange', this);
    window.document.getElementById('screen').classList.remove('locked');
  }

  /**
   * Try to validate current passcode
   */
  componentDidUpdate() {
    this.debug('did update');
    this.updateColdDownInfo();
    if (this.state.validing) {
      return;
    }
    if (this.state.currentPasscode === this.state.passcode) {
      this.setState({
        errorTimes: 0,
        retryTimestamp: 0,
        validing: true
      });
      SettingsObserver.setValue([{
        name: 'lockscreen.wrong.code.info',
        value: {
          errorTimes: 0
        }
      }]);
      if (!OrientationManager.isDefaultPortrait()) {
        this.element.classList.add('hide');
      }

      setTimeout(() => {
        this.props.unlock();
      }, this.VALIDING_TIMEOUT);
    } else if (this.state.currentPasscode.length >= this.state.passcode.length
      && !this.state.validing) {
      let { errorTimes } = this.state;
      let retryTimestamp = Date.now();
      errorTimes++;
      SettingsObserver.setValue([{
        name: 'lockscreen.wrong.code.info',
        value: {
          errorTimes,
          retryTimestamp
        }
      }]);
      this.setState({
        errorTimes,
        retryTimestamp,
        validing: true,
        error: 'incorrect',
        coldDown: !!this.getColdDownTime(errorTimes)
      });
      if (!this.getColdDownTime(errorTimes)) {
        setTimeout(() => {
          this.setState({
            validing: false,
            currentPasscode: '',
            error: ''
          });
        }, this.ERROR_STATE_TIMEOUT);
      }
    }
  }

  resetRetryTimestamp(errorTimes) {
    const retryTimestamp = Date.now();
    this['_observe_lockscreen.wrong.code.info']
      .call(this, {
      errorTimes,
      retryTimestamp
    });
    SettingsObserver.setValue([{
      name: 'lockscreen.wrong.code.info',
      value: {
        errorTimes,
        retryTimestamp
      }
    }]);
  }

  loadSettingsValue() {
    const key = 'lockscreen.passcode-lock.code';
    SettingsObserver.getValue(key).then((value) => {
      this.setState({
        passcode: value
      });
    });
    const wrongInfo = Service.query('wrongPasscodeInfo');
    if (wrongInfo && wrongInfo.errorTimes) {
      const coldDown = !!this.getColdDownTime(wrongInfo.errorTimes);
      this.state.coldDown = coldDown;
      this.state.errorTimes = wrongInfo.errorTimes;
      this.state.validing = !!coldDown;
      this.state.error = coldDown ? 'incorrect' : '';
      this.state.currentPasscode = coldDown ? 'lockInput' : '';
      if (this.props.firstLaunch) {
        this.resetRetryTimestamp(wrongInfo.errorTimes);
      } else {
        this.state.retryTimestamp = wrongInfo.retryTimestamp;
      }
    }
  }

  getColdDownTime(defaultErrorTimes = this.state.errorTimes) {
    const errorTimes =
      Math.min(this.coldDownMapping.length - 1, defaultErrorTimes);
    return this.coldDownMapping[errorTimes];
  }

  getInvalidCodeString() {
    const { errorTimes, error, coldDown, retryTimestamp } = this.state;
    let leftColdDownTime = 0;
    let string = '';
    this.timePassed = 0;
    if (error) {
      if (coldDown) {
        const curTime = Date.now();
        if (curTime >= retryTimestamp) {
          leftColdDownTime = Math.max(0, this.getColdDownTime() -
            Math.floor((curTime - retryTimestamp) / 1000));
          this.timePassed = this.getColdDownTime() - leftColdDownTime;
        }
        const timeString = new Date(2019, 9, 9, 9,
          Math.floor(leftColdDownTime / 60),
          leftColdDownTime % 60)
          .toLocaleString(navigator.language, {
            second: 'numeric',
            minute: 'numeric'
          });
        string = utils.toL10n('lockscreenColdDown', {
          n: timeString
        });
      } else {
        switch (errorTimes) {
          case 3:
          case 4:
          case 5:
            string = utils.toL10n('lockscreenCheckLockCode', {
              n: 6 - errorTimes
            });
            break;
          default:
            string = utils.toL10n('lockscreenInvalidCode');
            break;
        }
      }
    }
    return {
      string,
      coldDown: !!leftColdDownTime
    }
  }

  onKeyDown(evt) {
    if (document.hidden) {
      return;
    }
    let keycode = this.qwertyKeyMapping[evt.key] || evt.key;
    switch (keycode) {
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
        evt.preventDefault();
        evt.stopPropagation();
        if (this.state.validing) {
          break;
        }
        this.setState({
          currentPasscode: this.state.currentPasscode + keycode
        });
        break;
      case 'Backspace':
        evt.preventDefault();
        evt.stopPropagation();
        if (this.state.validing) {
          break;
        }
        if (this.state.currentPasscode.length) {
          this.setState({
            currentPasscode: this.state.currentPasscode.substr(0, this.state.currentPasscode.length - 1)
          });
        }
        break;
    }
  }

  render() {
    this.debug('ready to render ' + JSON.stringify(this.state));
    const passcode = this.state.currentPasscode.split('');
    let dom = [];

    for (let i = 0; i < this.PASSCODE_SIZE; i++) {
      const className = (passcode[i] !== undefined) ? 'code dotted' : 'code';
      dom.push(<div className={className} key={i}><div className="dot" /></div>);
    }
    let secondarInfo = utils.toL10n('lockscreenEnterLockCode');
    if (this.state.error) {
      const { string, coldDown } = this.getInvalidCodeString();
      secondarInfo = string;
      if (this.state.coldDown && !coldDown) {
        setTimeout(() => {
          const { coldDown } = this.getInvalidCodeString();
          if (!coldDown) {
            this.setState({
              coldDown,
              validing: false,
              currentPasscode: '',
              error: ''
            });
          }
        }, this.VALIDING_TIMEOUT);
      }
    }
    return <div id="passcode-view" className={this.state.error ? 'error' : ''}
            onKeyDown={(e)=>this.onKeyDown(e)} tabIndex="-1">
            <div className="secondary info-text" ref={ e => this.errorInfoElm = e }>
              {secondarInfo}
            </div>
             <div className="codes">
               {dom}
             </div>
           </div>;
  }
}
