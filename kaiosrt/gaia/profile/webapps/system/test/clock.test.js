import Timemachine from './mocks/timeMachine';

require('../js/clock');

describe('screenshot', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  });

  test('screenshot - init', (done) => {
    const FakeFresh = {
      fresh() {},
    };
    const spyObserver = jest.spyOn(FakeFresh, 'fresh');
    // use 59 sencond to let the timerID work
    Timemachine.config({
      dateString: 'December 25, 1991 13:12:59'
    });
    const { Clock } = window;
    const clock = new Clock();
    clock.start(FakeFresh.fresh);
    expect(spyObserver).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(2000);
    expect(spyObserver).toHaveBeenCalledTimes(3);
    clock.stop();
    expect(clock.timeoutID).toBe(null);
    expect(clock.timerID).toBe(null);
    spyObserver.mockRestore();
    done();
  });

  afterAll(() => {
    Timemachine.reset();
  });
});
