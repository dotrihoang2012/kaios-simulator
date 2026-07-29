global.DeviceCapabilityManager = {
  get: (feature) => {
    if (feature === 'device.wifi' || feature === 'device.bt') {
      return Promise.resolve('true');
    } else {
      return Promise.resolve('');
    }
  }
};
