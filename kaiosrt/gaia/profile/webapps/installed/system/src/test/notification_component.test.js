import React from 'react';
import Enzyme from 'enzyme';
import { shallow } from 'enzyme';
import Adapter from "enzyme-adapter-react-15.4";
import '../../test/mocks/mock_appOrigin';
import '../../test/mocks/SettingsURL';
import '../../test/mocks/SettingsObserver';
import '../../test/mocks/navigator/getDeviceStorage';
import '../../test/mocks/navigator/vibrate';
import NotificationComponent from '../notification_component';

Enzyme.configure({ adapter: new Adapter()});

describe('<NotificationComponent /> component test', () => {
  let wrapper = null;
  let instance = null;
  const observeSpy = jest.spyOn(SettingsObserver, 'observe');
  const getValueSpy = jest.spyOn(SettingsObserver, 'getValue');
  beforeAll(done => {
    wrapper = shallow(<NotificationComponent />);
    instance = wrapper.instance();
    done();
  });

  test('constructor function test', done => {
    expect(observeSpy).toBeCalledTimes(3);
    expect(observeSpy.mock.calls[0][0]).toBe('audio.volume.notification');
    expect(observeSpy.mock.calls[1][0]).toBe('notification.ringtone');
    expect(observeSpy.mock.calls[2][0]).toBe('vibration.enabled');
    expect(instance.audio instanceof Audio).toBeTruthy();
    expect(instance.notificationRingtoneURL instanceof SettingsURL).toBeTruthy();
    expect(instance.dialerRingtoneURL instanceof SettingsURL).toBeTruthy();
    expect(instance.vibrationIntervalID).toBeNull();
    expect(instance.vibrationTimerID).toBeNull();
    expect(instance.soundTimerID).toBeNull();
    done();
  });

  test('_observe_audio.volume.notification function test', done => {
    instance['_observe_audio.volume.notification'](0);
    expect(instance.silent).toBeTruthy();
    instance['_observe_audio.volume.notification'](1);
    expect(instance.silent).toBeFalsy();
    done();
  });

  test('_observe_notification.ringtone function test', done => {
    instance['_observe_notification.ringtone']('value');
    expect(instance.notificationRingtoneURL.set).toBeCalledTimes(1);
    done();
  });


  test('stopRingtone function test', done => {
    // this.audio.paused is true
    instance.stopRingtone();

    // this.audio.paused is false
    jest.useFakeTimers();
    jest.spyOn(instance.audio, 'paused', 'get')
      .mockReturnValueOnce(false);
    const pauseSpy = jest.spyOn(instance.audio, 'pause')
      .mockImplementationOnce(() => {});
    const loadSpy = jest.spyOn(instance.audio, 'load')
      .mockImplementationOnce(() => {});

    instance.stopRingtone();

    expect(clearTimeout).toBeCalledTimes(1);
    expect(instance.soundTimerID).toBeNull();
    expect(instance.audio.loop).toBeFalsy();
    expect(instance.audio.hasAttribute('src')).toBeFalsy();
    expect(pauseSpy).toBeCalledTimes(1);
    expect(loadSpy).toBeCalledTimes(1);
    done();
  });

  test('setRingtone function test', done => {
    const behavior = {
      soundFile: 'soundFile',
      loopControl: { sound: true }
    };
    const loadSpy = jest.spyOn(instance.audio, 'load')
      .mockImplementationOnce(() => {});
    instance.setRingtone(behavior);
    expect(instance.audio.getAttribute('src')).toBe('soundFile');
    expect(instance.audio.mozAudioChannelType).toBe('notification');
    expect(loadSpy).toBeCalledTimes(1);
    expect(instance.audio.loop).toBeTruthy();
    done();
  });

  test('playRingtone function test',async done => {
    jest.useFakeTimers();
    const behavior = {
      silent: false,
      loopControl: { soundMaxDuration: 100 }
    };
    const setRingtoneSpy = jest.spyOn(instance, 'setRingtone')
      .mockImplementationOnce(() => {});
    const stopRingtoneSpy = jest.spyOn(instance, 'stopRingtone')
      .mockImplementationOnce(() => {});
    const playSpy = jest.spyOn(instance.audio, 'play')
      .mockImplementationOnce(() => {});
    await instance.playRingtone(behavior);
    expect(setRingtoneSpy).toBeCalledTimes(1);
    expect(instance.soundTimerID).not.toBeNull();

    // setTimeout callback test
    jest.runOnlyPendingTimers();
    expect(stopRingtoneSpy).toBeCalledTimes(1);
    done();
  });

  test('_observe_vibration.enabled function test', done => {
    instance['_observe_vibration.enabled'](true);
    expect(instance.vibrationEnabled).toBeTruthy();
    done();
  });

  test('getVibrationPattern function test', done => {
    const behavior = {
      vibrationPattern: [300, 300, 300]
    };
    const pattern = instance.getVibrationPattern(behavior);
    expect(pattern).toEqual([300, 300, 300]);
    done();
  });

  test('vibrate function test', done => {
    jest.useFakeTimers();
    window.setInterval = jest.fn((callback) => {callback()});
    const stopVibrationSpy = jest.spyOn(instance, 'stopVibration')
      .mockImplementationOnce(() => {});
    const behavior = {
      silent: false,
      vibrationPattern: [300, 300, 300],
      loopControl: { vibration: true, vibrationMaxDuration: true }
    };
    instance.vibrationEnabled = true;
    instance.vibrate(behavior);
    expect(navigator.vibrate).toBeCalledTimes(2);

    // setTimeout callback test
    jest.runOnlyPendingTimers();
    expect(stopVibrationSpy).toBeCalledTimes(1);
    done();
  });

  test('stopVibration function test', done => {
    jest.useFakeTimers();
    instance.stopVibration();
    expect(clearInterval).toBeCalledTimes(1);
    expect(clearTimeout).toBeCalledTimes(1);
    expect(instance.vibrationIntervalID).toBeNull();
    expect(instance.vibrationTimerID).toBeNull();
    expect(navigator.vibrate).toBeCalledTimes(1);
    done();
  });

  afterEach(done => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });
});
