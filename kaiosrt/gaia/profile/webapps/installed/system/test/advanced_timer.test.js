require('../js/advanced_timer');

describe('advanced_timer', () => {

  beforeEach(() => {
    jest.useFakeTimers()
  })

  test('start', (done) => {
    const { advanced_timer } = window;
    let timeCb = false;
    const params = {
      'timeout': 2000,
      'timerId': 'fakeTimeId',
      'cb': () => {
        timeCb = true;
      }
    }
    const { timeout, timerId, cb } = params;
    advanced_timer.start(timerId, timeout, cb);
    expect(advanced_timer.timers[timerId]).not.toBeNull();
    expect(setTimeout).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(2000);
    expect(timeCb).toBe(true);
    done();
  });

  test('stop', (done) => {
    const { advanced_timer } = window;
    let timeCb = false;
    const params = {
      'timeout': 4000,
      'timerId': 'fakeTimeId',
      'cb': () => {
        timeCb = true;
      }
    }
    const { timeout, timerId, cb } = params;
    advanced_timer.start(timerId, timeout, cb);
    expect(advanced_timer.timers[timerId]).not.toBeNull();
    jest.advanceTimersByTime(2000);
    advanced_timer.stop('fakeTimeId');
    expect(advanced_timer.timers[timerId]).toBeUndefined();
    done();
  });
});
