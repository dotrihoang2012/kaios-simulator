describe('<js/wake_lock_manager.js> test', () => {
  beforeAll((done) => {
    window.DUMP = jest.fn();
    global.navigator.b2g = {
      addWakeLockListener: jest.fn(),
      getWakeLockState: jest.fn(),
      removeWakeLockListener: jest.fn()
    };
    require('../js/wake_lock_manager');
    done();
  });

  test('ScreenWakeLockManager test', (done) => {
    const screenWakeLockManager = new ScreenWakeLockManager();

    // start & setIsHeld test
    expect(screenWakeLockManager.isHeld).toBe(undefined);
    expect(screenWakeLockManager._started).toBe(false);

    screenWakeLockManager.start();
    expect(screenWakeLockManager.isHeld).toBe(0);
    expect(screenWakeLockManager._started).toBe(true);

    //stop test
    screenWakeLockManager.stop();
    expect(screenWakeLockManager._started).toBe(false);

    // callback test
    // 1,  screenWakeLockManager.state[topic] === undefined --> return
    screenWakeLockManager.callback();

    // 2,  screenWakeLockManager.state[topic] !== undefined
    screenWakeLockManager.state.screen = true;
    screenWakeLockManager.isHeld = 1;
    screenWakeLockManager.onwakelockchange = jest.fn();
    screenWakeLockManager.callback('screen', 'test');
    expect(screenWakeLockManager.onwakelockchange).toBeCalledTimes(1);
    expect(screenWakeLockManager.onwakelockchange.mock.calls[0][0]).toBe(0);
    done();
  });

  test('CpuWakeLockManager test', (done) => {
    const cpuWakeLockManager = new CpuWakeLockManager();

    // start & setIsHeld test
    expect(cpuWakeLockManager._started).toBe(false);

    cpuWakeLockManager._started = true;
    expect(() => {
      cpuWakeLockManager.start();
    }).toThrowError(/should not be start/);

    cpuWakeLockManager.state = null;
    cpuWakeLockManager._started = false;
    expect(() => {
      cpuWakeLockManager.start();
    }).toThrowError(/state is not set/);

    cpuWakeLockManager.state = {
      cpu: false
    };
    cpuWakeLockManager.start();
    expect(cpuWakeLockManager._started).toBe(true);

    // stop test
    cpuWakeLockManager.stop();
    expect(cpuWakeLockManager._listener).toBe(null);

    // callback test
    cpuWakeLockManager.state.cpu = true;
    cpuWakeLockManager.callback('cpu', 'locked-background');
    expect(cpuWakeLockManager.state.cpu).toBe('locked-background');
    done();
  });

  afterAll((done) => {
    global.navigator.b2g = {};
    done();
  });
});
