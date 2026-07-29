import React from 'react';
import BaseComponent from 'base-component';
import Service from 'service';
import SoftKeyStore from 'soft-key-store';
import SimpleNavigationHelper from 'simple-navigation-helper';
import SimCardHelper from './util/sim_card_helper';
import SettingsStore from './settings_store';

export default class DialerSuggestions extends BaseComponent {
  name = 'DialerSuggestions';

  static defaultProps = {
    dial: null,
    exitSuggestions: null,
    suggestions: null
  };

  static propTypes = {
    dial: React.PropTypes.func,
    exitSuggestions: React.PropTypes.func,
    suggestions: React.PropTypes.arrayOf(React.PropTypes.object)
  };

  constructor(props) {
    super(props);
    this.onKeyDown = this.onKeyDown.bind(this);
  }

  componentDidMount() {
    this.suggestionNavigator = new SimpleNavigationHelper('.dialer-focusable', this.element);
    window.addEventListener('unload', this.unloadHandler);
    this.updateSoftKeys();
    this.getVTSupportability();
  }

  componentDidUpdate() {
    this.updateSoftKeys();
  }

  unloadHandler = () => {
    window.removeEventListener('unload', this.unloadHandler);
    this.suggestionNavigator.destroy();
    SoftKeyStore.unregister(this.element);
  }

  updateSoftKeys(keys) {
    const softKeys = keys || {
      left: '',
      center: {
        text: SettingsStore.isRttAuto() ? 'rtt-call' : 'call',
        icon: ''
      },
      right: SettingsStore.isRttManual() ? 'options' : ''
    };

    // Show the SIM-card index icon when needed.
    if (SIMSlotManager.isMultiSIM() &&
      !SIMSlotManager.hasOnlyOneSIMCardDetected() &&
      !SimCardHelper.isAlwaysAsk() &&
      parseInt(SimCardHelper.cardIndex, 10) >= 0) {
      softKeys.center.icon = `sim-${SimCardHelper.cardIndex + 1}`;
    }

    SoftKeyStore.register(softKeys, this.element);
  }

  getVTSupportability() {
    DeviceCapabilityManager.get('device.vilte').then((hasVT) => {
      this.isVTSupported = hasVT;
    });
  }

  softRightHandleOption() {
    if (!SettingsStore.isRttManual()) {
      return;
    }
    let _activeElement = document.activeElement;
    let options = [];
    if (SettingsStore.isRttManual()) {
      options.unshift({
        id: 'rtt-call',
        callback: () => {
          _activeElement.focus();
          const { number } = this.getFocusedSuggestion();
          this.props.dial(number, { isRtt: true });
        }
      });
    }

    Service.request('showOptionMenu', {
      options: options,
      onCancel: () => this.element.focus()
    });
  }

  callHandleOption() {
    const emergencyCallNumbers = Service.query('emergencyCallNumbers');
    const isEmergencyCall = emergencyCallNumbers.indexOf(this.telNum) !== -1;
    if (!isEmergencyCall && this.isVTSupported) {
      let _activeElement = document.activeElement;
      let options = [{
        id: 'call',
        callback: () => {
          _activeElement.focus();
          const { number } = this.getFocusedSuggestion();
          this.props.dial(number, { isRtt: SettingsStore.isRttAuto() });
        },
      }, {
        id: 'video-call',
        callback: () => {
          _activeElement.focus();
          const { number } = this.getFocusedSuggestion();
          this.props.dial(number, { isVideo: true });
        },
      }];
      Service.request('showOptionMenu', {
        options: options,
        onCancel: () => this.element.focus()
      });
    } else {
      const { number } = this.getFocusedSuggestion();
      this.props.dial(number, { isRtt: SettingsStore.isRttAuto() });
    }
  }

  onKeyDown(evt) {
    if (Service.query('Dialer.isCalling')) {
      return;
    }
    switch (evt.key) {
      case 'SoftRight':
        evt.stopPropagation();
        this.softRightHandleOption();
        break;

      case 'Backspace':
        evt.stopPropagation();
        evt.preventDefault();
        this.props.exitSuggestions();
        break;

      case 'Enter':
      case 'Call': {
        evt.stopPropagation();
        this.callHandleOption();
        break;
      }
      default:
        break;
    }
  }

  getFocusedSuggestion() {
    let _nav = this.suggestionNavigator;
    let _index = _nav._candidates.indexOf(_nav._currentFocus);
    return this.props.suggestions[_index];
  }

  initFocus() {
    /**
      * XXX: When the user presses ArrowDown in dialerInput,
      *  we will switch the focus to suggestions list.
      * However, it will get extra keydown event of ArrowDown
      *  even if we do stopImmediatePropagation in Dialer.
      * It might be due to React's event mechanism,
      *  so we choose to setTimeout here to get rid out of it.
      */
    setTimeout(() => {
      let firstItem = this.element.querySelector('.dialer-focusable');
      // reset to focus the first item
      firstItem.focus();
      this.suggestionNavigator.setFocus(firstItem);
    }, 0);
  }

  formatMatchedNum(baseStr, keyword = this.props.suggestions.keyword) {
    let _start = baseStr.indexOf(keyword);
    if (-1 === _start) {
      return;
    }

    let prefix = baseStr.slice(0, _start);
    let suffix = baseStr.slice(_start + keyword.length);

    return (
      <span
        dir="ltr"
        className="dialerSuggestion__telNum"
      >
        {prefix}<mark>{keyword}</mark>{suffix}
      </span>
    );
  }

  suggestionsHtml() {
    let suggestionsHtml = this.props.suggestions.map((i, v) => {
      return (
        <li key={`suggestions-${v}`} className="dialer-focusable" tabIndex="-1">
          <div className="dialerSuggestion">
            <div className="dialerSuggestion__header text-pri">
              {i.name}
            </div>
            <div className="dialerSuggestion__detail text-sec">
              {i.type} {this.formatMatchedNum(i.number)}
            </div>
          </div>
        </li>
      );
    });

    return suggestionsHtml;
  }

  render() {
    return (
      <ul
        className="dialerSuggestions"
        onKeyDown={this.onKeyDown}
        ref={(node) => { this.element = node; }}
      >
        {this.suggestionsHtml()}
      </ul>
    );
  }
}
