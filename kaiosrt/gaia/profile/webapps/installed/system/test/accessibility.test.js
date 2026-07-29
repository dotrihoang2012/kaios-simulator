/* eslint-disable no-undef, global-require */
require('../js/accessibility');
require('./mocks/SettingsObserver')
require('./mocks/service.js')
require('./mocks/navigator/vibrate.js')

describe('accessibility test', () => {
  let accessibility;
  beforeAll(done => {
    accessibility = new Accessibility();
    accessibility.start()
    accessibility.screen = document.createElement('div');
    accessibility.screen.setAttribute('aria-hidden', true);
    expect(accessibility.name).toEqual('Accessibility');
    done();
  });
  beforeEach(done => {
    jest.clearAllMocks()
    done();
  });

  test('screenReaderEnabled test', (done) => {
    expect(accessibility.screenReaderEnabled()).toEqual(false);
    SettingsObserver.setValue([{
      name: 'accessibility.screenreader',
      value: true
    }]);
    expect(accessibility.screenReaderEnabled()).toEqual(true);
    done();
  });


  test('screenReaderEnabled logohidden', (done) => {
    expect(accessibility.screen.hasAttribute('aria-hidden')).toEqual(true);
    window.dispatchEvent(new CustomEvent('logohidden'))
    expect(accessibility.screen.hasAttribute('aria-hidden')).toEqual(false);
    done();
  });

  test('screenReaderEnabled screenchange', (done) => {
    jest
      .spyOn(accessibility.speechSynthesizer, 'cancel')
      .mockImplementation(() => {});
    window.dispatchEvent(new CustomEvent('screenchange', {
      detail: {
        screenEnabled: false
      }
    }));
    expect(accessibility.speechSynthesizer.cancel).toHaveBeenCalled();
    done();
  });

  test('screenReaderEnabled accessibility-output: action', (done) => {
    jest
      .spyOn(accessibility, '_playSound')
      .mockImplementation(() => {});
    expect(accessibility._playSound).toBeCalledTimes(0);
    window.dispatchEvent(new CustomEvent('accessibility-output', {
      detail: JSON.stringify({
        eventType: 'action',
        data: [{ string : 'clickAction' }]
      })
    }));
    expect(accessibility._playSound).toBeCalledTimes(1);
    done();
  });

  test('screenReaderEnabled accessibility-output: vc-change', (done) => {
    jest
      .spyOn(accessibility, '_playSound')
      .mockImplementation(() => {});
    jest
      .spyOn(navigator, 'vibrate')
      .mockImplementation(() => {});
    window.dispatchEvent(new CustomEvent('accessibility-output', {
      detail: JSON.stringify({
        eventType: 'vc-change',
        options: {isKey: true},
        data: [{ string : 'clickAction' }]
      })
    }));
    expect(accessibility._playSound).toBeCalledTimes(1);
    expect(accessibility._playSound).toHaveBeenCalledWith('vcKeyAudio');
    done();
  });

  test('screenReaderEnabled accessibility-output: no-move', (done) => {
    jest
      .spyOn(accessibility, '_playSound')
      .mockImplementation(() => {});
    window.dispatchEvent(new CustomEvent('accessibility-output', {
      detail: JSON.stringify({
        eventType: 'no-move'
      })
    }));
    expect(accessibility._playSound).toHaveBeenCalledWith('noMoveAudio');
    done();
  });

  test('screenReaderEnabled accessibility-output: text-change', (done) => {
    window.dispatchEvent(new CustomEvent('accessibility-output', {
      detail: JSON.stringify({
        options: {
          role: accessibility.AccessibleRole.ROLE_PASSWORD_TEXT,
          isInserted: true
        },
        eventType: 'text-change'
      })
    }));
    expect(navigator.vibrate).toHaveBeenCalledWith(100);
    done();
  });

  test('screenReaderEnabled accessibility-output: announcement', (done) => {
    jest
      .spyOn(accessibility, 'cancelHints');
    jest
      .spyOn(accessibility, 'setHintsTimeout');
    global.Service.set('isFtuRunning', true);
    window.dispatchEvent(new CustomEvent('accessibility-output', {
      detail: JSON.stringify({
        eventType: 'announcement',
        data: [{ string : 'screenReaderStarted' }]
      })
    }));
    expect(accessibility.cancelHints).toBeCalledTimes(0);
    expect(accessibility.setHintsTimeout).toBeCalledTimes(0);

    global.Service.set('isFtuRunning', false);
    Service.set('screenEnabled', true);
    jest
      .spyOn(accessibility.speechSynthesizer, 'speak');
    window.dispatchEvent(new CustomEvent('accessibility-output', {
      detail: JSON.stringify({
        eventType: 'announcement',
        data: ['screenReaderStarted']
      })
    }));
    expect(accessibility.cancelHints).toBeCalledTimes(2);
    expect(accessibility.setHintsTimeout).toBeCalledTimes(1);
    done();
  });
})
