require('../js/async_semaphore');

describe('async_semaphore', () => {
  test('wait', (done) => {
    const { AsyncSemaphore } = window;
    const asyncSemaphore = new AsyncSemaphore();
    let cbPara = false;
    const cb = () => {
      cbPara = true;
    }
    asyncSemaphore.wait(cb, this, {});
    expect(cbPara).toBe(true);
    done();
  });

  test('getValue', (done) => {
    const { AsyncSemaphore } = window;
    const asyncSemaphore = new AsyncSemaphore();
    expect(asyncSemaphore.getValue()).toBe(0);
    done();
  });

  test('getTasksLength', (done) => {
    const { AsyncSemaphore } = window;
    const asyncSemaphore = new AsyncSemaphore();
    let cbPara = false;
    const cb = () => {
      cbPara = true;
    }
    asyncSemaphore.wait(cb, this, {});
    expect(cbPara).toBe(true);
    expect(asyncSemaphore.getTasksLength()).toBe(0);
    done();
  });
});
