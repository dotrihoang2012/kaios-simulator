import React from 'react';
import Service from 'service';
import BaseComponent from 'base-component';
import EnhanceAnimation from 'enhance-animation';
import DialerInput from 'dialer_input';
import DialerSuggestions from 'dialer_suggestions';
import * as utils from './util/utils';
import dialHelper from './util/dial_helper';
import '../style/scss/dialer.scss';
import '../style/scss/option_menu.scss';

class Dialer extends BaseComponent {
  name = 'Dialer';

  ready = false;

  constructor(props) {
    super(props);
    this.initState = {
      dialerState: null,
      matchedContact: null,
      telNum: '',
      suggestions: []
    };
    this.state = Object.assign({}, this.initState);

    this.suggestionsTimer = null;
    this.emergencyCallNumbers = [];

    dialHelper.on('mmiloading', this.showLoading.bind(this));
    dialHelper.on('mmiloaded', this.showAlert.bind(this));
    this.children = {};

    ['onKeyDown', 'call', 'hide', 'updateTelNum', 'focusInput'].forEach((fn) => {
      this[fn] = this[fn].bind(this);
    });

    Service.register('show', this);
    Service.register('hide', this);
    Service.register('toggleStayEffect', this);
    Service.register('resetCallingMarker', this);
    Service.registerState('ready', this);
    Service.registerState('isShown', this);
    Service.registerState('isCalling', this);
    Service.registerState('emergencyCallNumbers', this);
    DeviceCapabilityManager.get('device.wifi.certified')
      .then((wifiCertified) => {
        this.wifiCertified = !!wifiCertified;
      });
  }

  componentDidMount() {
    ContactsManager.addEventListener(ContactsManager.EventMap.CONTACT_CHANGE,
      () => {
        if (this.isShown) {
          this.getSuggestions(this.state.telNum);
        }
      });
    this.updateTelTypes();
    this.monitorWifiCallStatus();
    dialHelper.getEmergencyCallNumbers()
      .then((numbers) => this.emergencyCallNumbers = numbers);

    this.parentBox = this.element.parentElement.parentElement;
    this.parentBox.addEventListener('animationend', () => {
      this.toggleStayEffect();
    });
    this.ready = true;
  }

  monitorWifiCallStatus() {
    this.getWifiCallInformation().imsHandlers.forEach((item) => {
      item.addEventListener('capabilitychange',
        this.updateWifiCallStatus.bind(this));
    });
  }

  getWifiCallInformation() {
    let conns = navigator.b2g.mobileConnections || [];
    let imsArr = [];
    let count = 0;
    Array.from(conns).forEach((item) => {
      let imsRegHandler = item.imsHandler;
      if (imsRegHandler) {
        if (imsRegHandler.capability === 'voice-over-wifi' ||
          imsRegHandler.capability === 'video-over-wifi') {
          count++;
        }
        imsArr.push(imsRegHandler);
      }
    });

    return {
      'imsHandlers': imsArr,
      'isWifiCallEnable': count > 0
    };
  }

  updateWifiCallStatus() {
    const wifiCallingStr = this.wifiCertified ?
      utils.toL10n('wifi-calling') : utils.toL10n('wlan-calling');
    let isWifiCallEnable = this.getWifiCallInformation().isWifiCallEnable;
    let nextDialerState = isWifiCallEnable ? wifiCallingStr : '';
    nextDialerState !== this.state.dialerState && this.setState({
      dialerState: nextDialerState
    });
  }

  show(firstChar) {
    if (this.isShown) {
      return;
    }

    if (this.isHidden()) {
      this.updateTelTypes();
      this.updateWifiCallStatus();
      Service.request('openSheet', 'dialer');
      this.isShown = true;

      this.element.focus();

      if (firstChar) {
        this.focusInput();
        this.children.dialerInput.sendFirstChar(firstChar);
      }
    }
  }

  hide() {
    if (!this.isHidden()) {
      Service.request('closeSheet', 'dialer');
    }
    this.isShown = false;
    this.children.dialerInput.element.style.fontSize = '';

    // reset to initState
    this.setState(this.initState);
    this.children.dialerInput.element.value = '';
  }

  updateTelTypes() {
    window.api.l10n.once(() => {
      this.telTypes = [
        'personal',
        'mobile',
        'home',
        'work',
        'fax-home',
        'fax-office',
        'fax-other'
      ].reduce((all, i) => {
        all[i] = utils.toL10n(i);
        return all;
      }, {});
    });
  }

  isHidden() {
    /**
     * We are wrapped by ReactAnimationComposer but we can't access it right now.
     * So we go through the DOM tree to see if any of the ancestors are being hidden.
     */
    var element = this.element;
    while (element !== document.body &&
           (!element.classList.contains('hidden') && 'closed' !== element.dataset.transitionState)
          ) {
      element = element.parentElement;
    }
    return element.classList.contains('hidden') || 'closed' === element.dataset.transitionState;
  }

  updateTelNum(telNum) {
    let newState = {
      telNum
    };

    // clear suggestions
    if (telNum.length < 2) {
      newState.matchedContact = this.initState.matchedContact;
      newState.suggestions = this.initState.suggestions;
    }

    this.setState(newState, () => {
      if (0 === telNum.length) {
        // will trigger closed when no number in input
        this.hide();
      } else if (dialHelper.instantDialIfNecessary(telNum)) {
        this.children.dialerInput.exitDialer();
        dialHelper.dial(telNum);
      }

      if (telNum.length >= 2) {
        if (this.suggestionsTimer) {
          clearTimeout(this.suggestionsTimer);
        }
        this.suggestionsTimer = setTimeout(() => {
          this.getSuggestions(telNum);
        }, 500);
      }
    });
  }

  focusInput() {
    this.stopRenderSteply();
    this.children.dialerInput.element.focus();
  }

  focusSuggestions() {
    if (!this.state.suggestions.length) {
      return;
    }

    this.children.dialerSuggestions.initFocus();

    if (this.allSuggestions.keyword) {
      return;
    }

    setTimeout(() => {
      this.renderSteply();
    }, 0);
  }

  renderSteply(step = 10, time = 50) {
    let nowLen = this.state.suggestions.length;
    if (this.allSuggestions.length <= nowLen) {
      this.stopRenderSteply();
      return;
    }
    let suggestions = this.allSuggestions.slice(0, nowLen + step);
    suggestions.keyword = this.state.telNum;
    this.setState({
      suggestions
    });
    this.suggestionRenderTimer = setTimeout(this.renderSteply.bind(this), time);
  }

  stopRenderSteply() {
    if (this.suggestionRenderTimer) {
      window.clearTimeout(this.suggestionRenderTimer);
      this.suggestionRenderTimer = null;
    }
  }

  call(number, options = { isVideo: false, isRtt: false }) {
    if (this.isCalling) {
      Service.request('showDialog', {
        ok: 'skip',
        cancel: 'cancel',
        type: 'confirm',
        content: 'otherConnectionInUseMessage',
        onOk: () => {
          Service.request('Dialer:resetCallingMarker');
        }
      });
      return;
    }
    this.isCalling = true;
    this.stopRenderSteply();
    // When the dial interface cannot reach the then and catch correctly,
    // we need to reset this flag to ensure the normal operation of the dialer.
    this.resetCallingFlagTimer = setTimeout(() => {
      this.isCalling = false;
    }, 3000);

    dialHelper.dial(number, options)
      .then(() => {
        let self = this;
        document.addEventListener('visibilitychange',
          function handleVisibilityChange() {
            if (document.hidden) {
              document.removeEventListener('visibilitychange',
                handleVisibilityChange);
              Service.request('Dialer:hide');
              !Service.query('isHidden') && Service.request('hideDialog');
              // Refresh the softkey to the softkey of mainview.
              Service.request('dialerFakeSoftKey');
              self.isCalling = false;
              clearTimeout(this.resetCallingFlagTimer);
            }
          });
      })
      .catch((err) => {
        this.isCalling = false;
        clearTimeout(this.resetCallingFlagTimer);
        err === 'BlockNumber' && dialHelper.showLimitNumberDialog();
      });
  }

  getSuggestions(num) {
    if (!dialHelper.isValid(num)) {
      return;
    }

    utils.contactNumFilter({ telNum: num }).then(this.filterSuggestions.bind(this, num));
  }

  filterSuggestions(num, contacts) {
    let matchedContact;
    let suggestions = contacts.reduce((summary, _contact) => {
      return summary.concat(_contact.tel.map((_tel) => {
        let contactInfo = {
          id: _contact.id,
          name: _contact.name,
          type: this.getL10nFromTelTypes(_tel.atype || 'mobile'),
          number: _tel.value
        };
        // get first contact info for .dialer-header
        if (!matchedContact && (_tel.value === num)) {
          matchedContact = contactInfo;
        }
        return contactInfo;
      }));
    }, []).filter((_s) => (-1 !== _s.number.indexOf(this.state.telNum)));

    this.allSuggestions = suggestions;

    // slice for first viewport lists
    // 5: magic number for critical path
    this.renderSuggestions(suggestions.slice(0, 5), matchedContact, num);
  }

  renderSuggestions(suggestions, matchedContact, num) {
    // checking tel-num, avoiding search delay
    if (num === this.state.telNum) {
      // keep keyword property for updating suggestions component
      suggestions.keyword = num;
      this.setState({
        matchedContact,
        suggestions
      }, () => {
        this.children.dialerSuggestions.element.scrollTo(0, 0);
      });
    }
  }

  onKeyDown(evt) {
    let key = evt.key;
    evt.stopPropagation();

    switch (key) {
      case 'EndCall':
        this.hide();
        break;

      case 'ArrowDown':
        this.focusSuggestions();
        break;

      case 'MicrophoneToggle':
        evt.preventDefault();
        break;
      default:
        break;
    }
  }

  getMatchedContactInfo(matchedContact = this.state.matchedContact) {
    let matchedContactInfo;
    if (matchedContact) {
      matchedContactInfo = [matchedContact.name, matchedContact.type].filter(Boolean).join(', ');
    }
    return matchedContactInfo;
  }

  showAlert(title, message) {
    this.resetCallingMarker();
    Service.request('Dialer:hide');
    if (!title && !message) {
      Service.request('hideDialog');
      return;
    }
    Service.request('showDialog', {
      type: 'alert',
      header: title,
      content: utils.toL10n(message),
      translated: true,
      noClose: false
    });
  }

  resetCallingMarker() {
    this.isCalling = false;
  }

  showLoading() {
    this.resetCallingMarker();
    Service.request('Dialer:hide')
    .then(() => {
      Service.request('showDialog', {
        type: 'alert',
        content: 'sending',
        otherClass: 'is-loading',
        noClose: false,
        onOk: () => {
          dialHelper.mmiloading = false;
        },
        onBack: () => {
          dialHelper.mmiloading = false;
        }
      });
    });
  }

  getL10nFromTelTypes(type) {
    return this.telTypes[type] || type;
  }

  // use CSS animation let dialer UI hide later
  toggleStayEffect = (activity = false) => {
    this.parentBox.classList.toggle('with-dialer-stay-effect', activity);
  };

  render() {
    return (
      <div
        className="dialerBox"
        tabIndex="-1"
        onKeyDown={this.onKeyDown}
        ref={(node) => { this.element = node; }}
      >
        <div className="dialer-header">
          <div className="dialer-state text-thi">{this.state.dialerState}</div>
          <DialerInput
            ref={(node) => { this.children.dialerInput = node; }}
            dial={this.call}
            exitDialer={this.hide}
            updateTelNum={this.updateTelNum}
          />
          <div className="dialer-info text-thi">{this.getMatchedContactInfo()}</div>
        </div>

        <DialerSuggestions
          ref={(node) => { this.children.dialerSuggestions = node; }}
          suggestions={this.state.suggestions}
          exitSuggestions={this.focusInput}
          dial={this.call}
        />
      </div>
    );
  }
}

export default EnhanceAnimation(Dialer, 'immediate', 'immediate');
