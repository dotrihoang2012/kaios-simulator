class SettingsStore {
  name = 'SettingsStore';
  DEBUG = false;

  settings = {
    rttEnabled: null,
    rttPreferredSettings: null
  };

  constructor() {
    SettingsObserver.observe('ril.rtt.enabled', null,
      this['_observe_ril.rtt.enabled']);
    SettingsObserver.observe('ril.rtt.preferredSettings', null,
      this['_observe_ril.rtt.preferredSettings']);
  }

  '_observe_ril.rtt.enabled' = (value) => {
    this.settings.rttEnabled = value;
  }
  '_observe_ril.rtt.preferredSettings' = (value) => {
    this.settings.rttPreferredSettings = value;
  }

  get rttPref() {
    /**
     * Since this.settings is updated asynchronously,
     * we should throw a warning when it's still not loaded yet.
     */
    if (null === this.settings.rttEnabled ||
      null === this.settings.rttPreferredSettings) {
      console.warn('RTT settings havn\'t been loaded yet to be accessible.');
    }
    if (!this.settings.rttEnabled) {
      return null;
    }
    return this.settings.rttPreferredSettings;
  }

  isRttAuto = () => ('always-visible-automatic' === this.rttPref);
  isRttManual = () => ('always-visible-manual' === this.rttPref);

  waitForRttPref = () => Promise.all([
    SettingsObserver.getValue('ril.rtt.enabled'),
    SettingsObserver.getValue('ril.rtt.preferredSettings')
  ]);
}

const storeInstance = new SettingsStore();
export default storeInstance;
