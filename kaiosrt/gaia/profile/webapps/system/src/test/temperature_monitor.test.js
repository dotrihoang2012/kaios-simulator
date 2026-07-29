import '../../test/mocks/navigator/getBattery';
import '../../test/mocks/service';

describe('temperature_monitor.js test', () => {

  beforeEach(done => {
    window.clearInterval = jest.fn();
    window.setInterval = jest.fn();
    done();
  });

  afterEach(done => {
    jest.resetModules();
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });

  // powerSupplyOnline is true, health: undefined
  test('start function test without battery.health', done => {
    window.navigator.b2g = {
      powerSupplyManager: { powerSupplyOnline: true}
    };
    const getBatterySpy = jest.spyOn(navigator, 'getBattery').mockResolvedValue({
      addEventListener: jest.fn(),
      present: true
    });

    require('../temperature_monitor');

    const removeEventListener = jest.spyOn(window, 'removeEventListener');
    window.dispatchEvent(new CustomEvent('logohidden'));

    process.nextTick(() => {
      expect(getBatterySpy).toHaveBeenCalledTimes(1);
      expect(window.clearInterval).toHaveBeenCalledTimes(2);
      expect(removeEventListener).toHaveBeenCalledTimes(1);
      expect(removeEventListener.mock.calls[0][0]).toEqual('logohidden');
      done();
    });
  });

  test('start function test with battery.health is Overheat', done => {
    // powerSupplyOnline is true, health: Overheat
    window.navigator.b2g = {
      powerSupplyManager: { powerSupplyOnline: true}
    };
    const getBatterySpy = jest.spyOn(navigator, 'getBattery').mockResolvedValue({
      addEventListener: jest.fn(),
      present: true,
      health: 'Overheat'
    });
    require('../temperature_monitor');
    process.nextTick(() => {
      expect(getBatterySpy).toHaveBeenCalledTimes(1);
      expect(window.clearInterval).toHaveBeenCalledTimes(1);
      expect(window.setInterval).toHaveBeenCalledTimes(1);
      expect(Service.request).toHaveBeenCalledTimes(1);
      expect(Service.request.mock.calls[0][0]).toEqual('DialogService:show');
      expect(Service.request.mock.calls[0][1].content).toEqual('battery-temperature-high-stop-charging');
      done();
    });
  });

  test('start function test with battery.health is Cold', done => {
    // powerSupplyOnline is true, health: Cold
    window.navigator.b2g = {
      powerSupplyManager: { powerSupplyOnline: true}
    };
    const getBatterySpy = jest.spyOn(navigator, 'getBattery').mockResolvedValue({
      addEventListener: jest.fn(),
      present: true,
      health: 'Cold'
    });
    require('../temperature_monitor');
    process.nextTick(() => {
      expect(getBatterySpy).toHaveBeenCalledTimes(1);
      expect(window.clearInterval).toHaveBeenCalledTimes(1);
      expect(window.setInterval).toHaveBeenCalledTimes(1);
      expect(Service.request).toHaveBeenCalledTimes(1);
      expect(Service.request.mock.calls[0][0]).toEqual('DialogService:show');
      expect(Service.request.mock.calls[0][1].content).toEqual('battery-temperature-low-stop-charging');
      done();
    });
  });

  test('start function test with battery.health is Overheat, powerSupplyOnline is false', done => {
    // powerSupplyOnline is false, health: Overheat
    window.navigator.b2g = {
      powerSupplyManager: { powerSupplyOnline: false}
    };
    const getBatterySpy = jest.spyOn(navigator, 'getBattery').mockResolvedValue({
      addEventListener: jest.fn(),
      present: true,
      health: 'Overheat'
    });
    require('../temperature_monitor');
    process.nextTick(() => {
      expect(getBatterySpy).toHaveBeenCalledTimes(1);
      expect(window.clearInterval).toHaveBeenCalledTimes(1);
      expect(window.setInterval).toHaveBeenCalledTimes(1);
      expect(Service.request).toHaveBeenCalledTimes(1);
      expect(Service.request.mock.calls[0][0]).toEqual('DialogService:show');
      expect(Service.request.mock.calls[0][1].content).toEqual('battery-temperature-high');
      done();
    });
  });

  test('start function test with battery.health is Cold, powerSupplyOnline is false', done => {
    // powerSupplyOnline is false, health: Cold
    window.navigator.b2g = {
      powerSupplyManager: { powerSupplyOnline: false}
    };
    const getBatterySpy = jest.spyOn(navigator, 'getBattery').mockResolvedValue({
      addEventListener: jest.fn(),
      present: true,
      health: 'Cold'
    });
    require('../temperature_monitor');
    process.nextTick(() => {
      expect(getBatterySpy).toHaveBeenCalledTimes(1);
      expect(window.clearInterval).toHaveBeenCalledTimes(1);
      expect(window.setInterval).toHaveBeenCalledTimes(1);
      expect(Service.request).toHaveBeenCalledTimes(1);
      expect(Service.request.mock.calls[0][0]).toEqual('DialogService:show');
      expect(Service.request.mock.calls[0][1].content).toEqual('battery-temperature-low');
      done();
    });
  });

  test('setInterval function test', done => {
    window.setInterval = jest.fn((callback) => {callback()});
    window.navigator.b2g = {
      powerSupplyManager: { powerSupplyOnline: true}
    };
    const getBatterySpy = jest.spyOn(navigator, 'getBattery').mockResolvedValue({
      addEventListener: jest.fn(),
      present: true,
      health: 'Overheat',
      temperature: 64
    });
    require('../temperature_monitor');
    process.nextTick(() => {
      expect(getBatterySpy).toHaveBeenCalledTimes(1);
      expect(Service.request).toHaveBeenCalledTimes(2);
      expect(Service.request.mock.calls[0][0]).toEqual('startPowerOff');
      expect(Service.request.mock.calls[1][0]).toEqual('DialogService:show');
      done();
    });
  });

  afterAll(done => {
    window.navigator.b2g = undefined;
    done();
  });
});
