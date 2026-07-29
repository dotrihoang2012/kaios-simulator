import MockCpuWakeLockManager from './mocks/mock_cpu_wakelock_manager';

global.CpuWakeLockManager = MockCpuWakeLockManager;

require('../js/cpu_manager');

describe('cpu_manager', () => {
  test('start', (done) => {
    const { CpuManager } = window;
    const cpuManager = new CpuManager();
    cpuManager.start();
    expect(cpuManager._started).toBe(true);
    done();
  });

  test('stop without start', (done) => {
    const { CpuManager } = window;
    const cpuManager = new CpuManager();
    expect(() => {
      cpuManager.stop();
    }).toThrow();
    done();
  });

  test('stop', (done) => {
    const { CpuManager } = window;
    const cpuManager = new CpuManager();
    cpuManager.start();
    expect(cpuManager._started).toBe(true);
    cpuManager.stop();
    expect(cpuManager._started).toBe(false);
    done();
  });
});
