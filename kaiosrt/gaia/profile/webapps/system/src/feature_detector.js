import BaseModule from 'base-module';
/* global DeviceCapabilityManager */
class FeatureDetector extends BaseModule {
  service = window.Service;

  STATES = ['isFlip', 'hasEndCallKey', 'hasVolumeKey', 'isLowMemoryDevice',
    'supportSwitchPrimarysim', 'hasVT', 'hasRtt', 'isQwerty',
    'isParentalControl', 'supportDualLte', 'hasMVS', 'hasRSU'];

  isFlip = false;
  hasEndCallKey = true;
  hasVolumeKey = true;
  isLowMemoryDevice = false;
  supportSwitchPrimarysim = false;
  hasVT = false;
  hasRtt = false;
  isQwerty = false;
  isParentalControl = false;
  supportDualLte = false;
  hasMVS = false;
  hasRSU = false;
  DEBUG = false;

  start() {
    DeviceCapabilityManager.get('device.mvs').then((hasMVS) => {
      this.hasMVS = !!hasMVS;
      Service.registerState('hasMVS', this);
    });

    DeviceCapabilityManager.get('device.rsu').then((hasRSU) => {
      this.hasRSU = !!hasRSU;
      Service.registerState('hasRSU', this);
    });

    DeviceCapabilityManager.get('device.flip').then((isFlip) => {
      this.isFlip = !!isFlip;
      Service.registerState('isFlip', this);
    });

    DeviceCapabilityManager.get('device.key.endcall').then((hasEndCallKey) => {
      this.hasEndCallKey = !!hasEndCallKey;
      Service.registerState('hasEndCallKey', this);
    });

    DeviceCapabilityManager.get('device.key.volume').then((hasVolumeKey) => {
      this.hasVolumeKey = !!hasVolumeKey;
      Service.registerState('hasVolumeKey', this);
    });

    DeviceCapabilityManager.get('ril.support.primarysim.switch').then((support) => {
      this.supportSwitchPrimarysim = !!support;
      Service.registerState('supportSwitchPrimarysim', this);
    });

    DeviceCapabilityManager.get('device.vilte').then((hasVT) => {
      this.hasVT = !!hasVT;
      Service.registerState('hasVT', this);
    });

    DeviceCapabilityManager.get('device.rtt').then((hasRtt) => {
      this.hasRtt = !!hasRtt;
      Service.registerState('hasRtt', this);
    });

    DeviceCapabilityManager.get('device.dual-lte').then((support) => {
      this.supportDualLte = !!support;
      Service.registerState('supportDualLte', this);
    });

    DeviceCapabilityManager.get('device.qwerty').then((isQwerty) => {
      this.isQwerty = !!isQwerty;
      Service.registerState('isQwerty', this);
    });

    DeviceCapabilityManager.get('device.parental-control')
      .then((isParentalControl) => {
      this.isParentalControl = !!isParentalControl;
      Service.registerState('isParentalControl', this);
    });

    DeviceCapabilityManager.get('device.sim-hotswap').then((support) => {
      this.supportSimHotswap = !!support;
      Service.registerState('supportSimHotswap', this);
    });

    DeviceCapabilityManager.get('device.dfc').then((support) => {
      this.supportDFC = !!support;
      Service.registerState('supportDFC', this);
    });
    DeviceCapabilityManager.get('device.wifi.certified')
      .then((value) => {
      this.isWifiCertified = !!value;
      Service.registerState('isWifiCertified', this);
    });

    Promise.all([
      DeviceCapabilityManager.get('hardware.memory'),
      this.loadMemoryConfig()
    ]).then((results) => {
      let memOnDevice = results[0];
      let memConfigProfile = results[1];
      this.isLowMemoryDevice =
        (memOnDevice <= 256) || (memConfigProfile === 'low') ? true : false;
      Service.registerState('isLowMemoryDevice', this);
    }, (reason) => {
      this.debug('--> reject with reason: ' + reason);
      Service.registerState('isLowMemoryDevice', this);
    });
  }

  loadMemoryConfig() {
    return new Promise((resolve, reject) => {
      let url = './resources/memory-profile.json';
      LazyLoader.getJSON(url).then((json) => {
        resolve(json.profile);
      }, (error) => {
        this.debug('--> Failed to fetch file: ' + url + ',' + error);
        resolve(null);
      });
    });
  }
}

const featureDetector = new FeatureDetector();
featureDetector.start();
window.fd = featureDetector;

export default featureDetector;
