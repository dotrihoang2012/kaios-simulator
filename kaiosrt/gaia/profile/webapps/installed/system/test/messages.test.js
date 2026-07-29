describe('<js/messages.js> test', () => {
  beforeAll((done) => {
    require('./mocks/navigator/vibrate');
    require('./mocks/service');
    require('./mocks/SettingsObserver');
    jest
      .spyOn(SettingsObserver, 'observe')
      .mockImplementation((name, defaultValue, callback) => {
        if (defaultValue === true) {
          callback(true);
        } else {
          callback();
        }
      });
    jest
      .spyOn(window.HTMLMediaElement.prototype, 'play')
      .mockImplementation(() => {});
    jest
      .spyOn(window.HTMLMediaElement.prototype, 'pause')
      .mockImplementation(() => {});
    require('../js/messages');
    done();
  });

  test('init function test', (done) => {
    expect(SettingsObserver.observe).toBeCalledTimes(2);
    expect(SettingsObserver.observe.mock.calls[0][0]).toEqual('audio.volume.notification');
    expect(SettingsObserver.observe.mock.calls[1][0]).toEqual('vibration.enabled');
    done();
  });

  test('messagesHandler  & ringtone & vibrate function test', (done) => {
    jest
      .spyOn(Service, 'query')
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    const event = {
      detail: {
        category: 'systemmessage',
        type: 'sms-received',
        data: {
          messageClass: 'class-0'
        }
      }
    };

    //1, messagesHandler function test
    //!!Service.query('remoteLockEnabled') === true --> return
    window.dispatchEvent(new CustomEvent('serviceworkermessage', event));
    expect(Service.request).toBeCalledTimes(0);

    //!!Service.query('remoteLockEnabled') === false
    jest.useFakeTimers();

    window.dispatchEvent(new CustomEvent('serviceworkermessage', event));
    expect(Service.request).toBeCalledTimes(1);

    //2, ringtone function test
    expect(HTMLMediaElement.prototype.play).toBeCalledTimes(1);
    expect(HTMLMediaElement.prototype.pause).toBeCalledTimes(0);

    jest.runAllTimers();

    expect(setTimeout).toBeCalledTimes(1);
    expect(HTMLMediaElement.prototype.pause).toBeCalledTimes(1);
    expect(setTimeout).toBeCalledWith(expect.any(Function), 2000);

    //3, vibrate function test
    expect(navigator.vibrate).toBeCalledTimes(1);
    expect(navigator.vibrate.mock.calls[0][0]).toEqual([200, 200, 200, 200]);
    done();
  });

  afterAll((done) => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });
});