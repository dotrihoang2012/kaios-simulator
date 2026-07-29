function PowerSave() {}
PowerSave.prototype = {
  start: jest.fn(),
  onBatteryChange: jest.fn()
};
global.PowerSave = PowerSave;
