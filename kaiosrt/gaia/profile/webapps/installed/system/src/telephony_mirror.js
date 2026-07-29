'use strict'
/* global TelephonyManager */
class TelephonyMirror {
  callState = {
    IDLE: 0,
    RINGING: 1,
    OFFHOOK: 2
  }
  start() {
    if (!navigator.b2g.telephony) {
      console.warn('telephonyMirror init find no navigator.b2g.telephony, return');
      return;
    }

    this._telephony = navigator.b2g.telephony;
    this._telephony.addEventListener('callschanged', this);
    this._telephony.addEventListener('incoming', this);
    if (this._telephony.conferenceGroup) {
      this._telephony.conferenceGroup.addEventListener(`statechange`, this);
    }
    this._handlePhoneState();
  }

  /**
   * To update telephony daemon with latest phone state.
   */
  _handlePhoneState() {
    let calls = this._telephony.calls;
    let phoneState = this.callState.IDLE;
    if (calls.length > 0) {
      phoneState = this._hasRingingCall(calls) ?
        this.callState.RINGING : this.callState.OFFHOOK;
    } else if (this._telephony.conferenceGroup) {
      switch (this._telephony.conferenceGroup.state) {
        case "connected":
        case "held":
          phoneState = this.callState.OFFHOOK;
          break;
      }
    }

    if (this._phoneState === undefined ||
        this._phoneState !== phoneState) {
      TelephonyManager.setCallState(phoneState);
      this._phoneState = phoneState;
    }
  }

  /**
   * To know whether device is idle or not.
   * @param {TelephonyCall[]} aCalls
   */
  _hasRingingCall(aCalls) {
    if (aCalls && aCalls.length > 0) {
      for (let index = 0; index < aCalls.length; index++) {
        if (aCalls[index].state === 'incoming') {
          return true;
        }
      }
    }
    return false;
  }

  handleEvent(evt) {
    if (evt.type === 'callschanged') {
      this._handlePhoneState();
    } else if (evt.type === 'incoming') {
      if (evt.call) {
        let telephonyMirror = this;
        evt.call.addEventListener('statechange', () => {
          telephonyMirror._handlePhoneState();
        });
      }
    } else if (evt.type === `statechange`) {
      this._handlePhoneState();
    }
  }
}

// To initialize telephony mirror component.
const instance = new TelephonyMirror();
instance.start();

export default instance;
