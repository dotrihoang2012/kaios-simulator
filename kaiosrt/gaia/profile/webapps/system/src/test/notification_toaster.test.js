/* eslint-disable no-undef */
import React from 'react';
import Enzyme from 'enzyme';
import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import Adapter from 'enzyme-adapter-react-15.4';
import '../../test/mocks/mock_appOrigin';
import '../../test/mocks/service';
import '../../test/mocks/SettingsObserver';
import '../../test/mocks/SettingsURL';
import '../../test/mocks/mock_applications';
import '../../test/mocks/navigator/vibrate';
import '../../test/mocks/l10n';
import BaseComponent from 'base-component';
import NotificationToaster from '../notification_toaster';

Enzyme.configure({ adapter: new Adapter()});

jest.mock('../enhance_animation', () => {
  return {
    __esModule: true,
    default: (ComposedComponent) => { return ComposedComponent; }
  }
});

describe('<NotificationToaster /> component test', () => {
  let wrapper = null;
  let instance = null;
  const observeSpy = jest.spyOn(SettingsObserver, 'observe');
  beforeAll(done => {
    wrapper = mount(<NotificationToaster />);
    instance = wrapper.instance();
    done();
  });

  test('<NotificationToaster /> dom render test', done => {
    expect(toJson(wrapper)).toMatchSnapshot();
    expect(wrapper.state()).toEqual({ "notification": null });
    expect(instance.element).not.toBeNull();
    expect(Service.register).toBeCalledTimes(1);
    expect(Service.register.mock.calls[0][0]).toBe('show');
    expect(observeSpy).toBeCalledTimes(3);
    expect(observeSpy.mock.calls[0][0]).toBe('audio.volume.notification');
    expect(observeSpy.mock.calls[1][0]).toBe('vibration.enabled');
    expect(observeSpy.mock.calls[2][0]).toBe('notification.ringtone');
    expect(instance.ringtoneURL).not.toBeUndefined();
    expect(window.nt).not.toBeUndefined();
    done();
  });

  test('_observe_notification.ringtone function test', done => {
    jest.spyOn(instance.ringtoneURL, 'set')
      .mockReturnValueOnce('val111');
    instance['_observe_notification.ringtone']('val1');
    expect(instance._sound).toBe('val111');
    done();
  });

  test('_observe_audio.volume.notification function test', done => {
    instance['_observe_audio.volume.notification'](0);
    expect(instance.silent).toBeTruthy();
    instance['_observe_audio.volume.notification'](1);
    expect(instance.silent).toBeFalsy();
    done();
  });

  test('_observe_vibration.enabled function test', done => {
    instance['_observe_vibration.enabled'](true);
    expect(instance.vibrationEnabled).toBeTruthy();
    instance['_observe_vibration.enabled'](false);
    expect(instance.vibrationEnabled).toBeFalsy();
    done();
  });

  test('show function test', done => {
    jest.useFakeTimers();
    jest.spyOn(instance, 'componentDidUpdate').mockImplementation(() => {});
    jest.mock('base-component');
    BaseComponent.prototype.open = jest.fn();
    const hideSpy = jest.spyOn(instance, 'hide').mockImplementation(() => {});

    const notification = {
      icon: 'icons/icon.png?',
      id: '::#id',
      data: { bluetoothSize: true },
      origin: null,
      appIcon: 'icons/appIcon.png',
      dir: 'rtl'
    };
    instance.show(notification);

    expect(Service.request).toBeCalledTimes(1);
    expect(Service.request.mock.calls[0]).toEqual(["turnScreenOn", "notification-toast"]);
    expect(BaseComponent.prototype.open).toBeCalledTimes(1);
    expect(instance.timer).not.toBeNull();

    // setTimeout callback test
    jest.runOnlyPendingTimers();
    expect(instance.timer).toBeNull();
    expect(hideSpy).toBeCalledTimes(1);
    done();
  });

  test('hide function test', done => {
    jest.mock('base-component');
    BaseComponent.prototype.close = jest.fn();

    instance.hide();
    expect(navigator.vibrate).toBeCalledTimes(1);
    expect(BaseComponent.prototype.close).toBeCalledTimes(1);
    done();
  });

  test('render & componentDidUpdate function test', done => {
    jest.useFakeTimers();
    window.Audio = jest.fn();
    window.Audio.prototype.play = jest.fn();
    window.Audio.prototype.pause = jest.fn();
    window.Audio.prototype.removeAttribute = jest.fn();
    window.Audio.prototype.load = jest.fn();
    instance.vibrationEnabled = true;
    jest.spyOn(Service, 'query')
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    const notification = {
      icon: 'icons/icon.png?',
      id: '11#id:wificall',
      data: { bluetoothSize: true },
      origin: null,
      appIcon: 'icons/appIcon.png',
      dir: 'rtl',
      manifestURL: 'http://communications.localhost/manifest.webmanifest',
      mozbehavior: {vibrationPattern: [300, 300, 300]}
    };
    wrapper.setState({ notification });
    wrapper.update();
    expect(toJson(wrapper)).toMatchSnapshot();
    expect(window.Audio.prototype.play).toBeCalledTimes(1);
    expect(navigator.vibrate).toBeCalledTimes(1);

    // setTimeout callback test
    jest.runOnlyPendingTimers();
    expect(window.Audio.prototype.pause).toBeCalledTimes(1);
    expect(window.Audio.prototype.removeAttribute).toBeCalledTimes(1);
    expect(window.Audio.prototype.load).toBeCalledTimes(1);
    done();
  });

  afterEach(done => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });

  afterAll(done => {
    wrapper.unmount();
    wrapper = null;
    instance = null;
    done();
  });
});
