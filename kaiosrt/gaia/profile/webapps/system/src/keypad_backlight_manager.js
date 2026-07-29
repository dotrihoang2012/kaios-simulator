 import BaseModule from 'base-module';
/* global PowerManager */
class KeypadBacklightManager extends BaseModule {

  name = 'KeypadBacklightManager';

  TURN_OFF_TIME = 60000;
  DECREASE_BRIGHTNESS_TIME = 10000;

  _turnOffTimer = null;
  _decreaseBrightnessTimer = null;

  DEBUG = false;

  start() {
    Service.register('turnKeypadBacklightOn', this);
    window.addEventListener('screenchange', this);
  }

  turnKeypadBacklightOn() {
    if (this._turnOffTimer) {
      this.clearTimer();
    }
    this.turnOn();
    this.createTimer();
  }

  turnKeypadBacklightOff() {
    this.clearTimer();
    this.turnOff();
  }

  turnOn() {
    PowerManager.setKeyLightEnabled(true);
    PowerManager.setKeyLightBrightness(50);
    this.debug('set keyLightEnabled = true, keyLightBrightness = 50');
  }

  turnOff() {
    PowerManager.setKeyLightEnabled(false);
    this.debug('set keyLightEnabled = false');
  }

  createTimer() {
    this._turnOffTimer = setTimeout(() => {
      PowerManager.setKeyLightEnabled(false);
      this.debug('set keyLightEnabled = false');
    }, this.TURN_OFF_TIME);

    this._decreaseBrightnessTimer = setTimeout(() => {
      PowerManager.setKeyLightBrightness(10);
      this.debug('set keyLightBrightness = 10');
    }, this.DECREASE_BRIGHTNESS_TIME);
  }

  clearTimer() {
    clearTimeout(this._turnOffTimer);
    clearTimeout(this._decreaseBrightnessTimer);
  }

  _handle_screenchange(evt) {
    if (evt.detail.screenEnabled) {
      this.turnKeypadBacklightOn();
    } else {
      this.turnKeypadBacklightOff();
    }
  }
}

var instance = new KeypadBacklightManager();
instance.start();

export default instance;
