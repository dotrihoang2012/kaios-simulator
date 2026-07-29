/* global AppStore */
import Service from 'service';
import { launch } from '../AppStore/Item';

class LaunchStore {
  name = 'LaunchStore';

  constructor() {
    this.ports = {};
    window.addEventListener('visibilitychange', this.resetLaunchingMarker);
    window.addEventListener('blur', this.resetLaunchingMarker);
    window.addEventListener('focus', this.resetLaunchingMarker);
    Service.register('resetLaunchingMarker', this);
    Service.registerState('isLaunching', this);
  }

  refreshLaunchStateTimer() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.isLaunching = false;
    }, 2000);
  }

  resetLaunchingMarker = () => {
    this.isLaunching = false;
    clearTimeout(this.timer);
  }

  launch(prop, value) {
    this.refreshLaunchStateTimer();
    if (!prop || !value) {
      console.warn('wrong launching parameters');
      return;
    }
    if ('iac' === prop) {
      // not something
    } else {
      this.launchApp(prop, value);
    }
  }

  launchApp(prop, value) {
    if (this.isLaunching) {
      return;
    }
    this.isLaunching = true;

    let matchedApp = AppStore.queryApp(prop, value);
    if (matchedApp) {
      launch(matchedApp);
    } else {
      console.warn(`Can't find any app with ${prop}: ${value}!`);
    }
  }

  launchVirtualApp() {
    // The interface is not good.
  }
}

export default (new LaunchStore());
