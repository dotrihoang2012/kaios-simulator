import '../../lockscreen/lockscreen_migrator';

describe('lockscreen_migrator.js test', () => {
  const appclosingCB = jest.fn();
  const appclosedCB = jest.fn();
  const appopenedCB = jest.fn();
  test('addEventListener test', done => {
    window.addEventListener('lockscreen-appclosing', appclosingCB);
    window.addEventListener('lockscreen-appclosed', appclosedCB);
    window.addEventListener('lockscreen-appopened', appopenedCB);
    window.dispatchEvent(new CustomEvent('lockscreen--deactivating'));
    window.dispatchEvent(new CustomEvent('lockscreen--deactivated'));
    window.dispatchEvent(new CustomEvent('lockscreen--activated'));
    expect(appclosingCB).toBeCalledTimes(1);
    expect(appclosedCB).toBeCalledTimes(1);
    expect(appopenedCB).toBeCalledTimes(1);
    done();
  });

  afterAll(done => {
    window.removeEventListener('lockscreen-appclosing', appclosingCB);
    window.removeEventListener('lockscreen-appclosed', appclosedCB);
    window.removeEventListener('lockscreen-appopened', appopenedCB);
    done();
  });
});
