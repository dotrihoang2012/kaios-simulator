/* eslint-disable no-undef */
import React from 'react';
import Enzyme from 'enzyme';
import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import Adapter from 'enzyme-adapter-react-15.4';
import LockscreenView from '../new_lock_screen_view';
import '../../test/mocks/screen';
import '../../test/mocks/SettingsObserver';
import '../../test/mocks/simslot_manager';
import '../../test/mocks/service';
import '../../test/mocks/DeviceCapabilityManager';
import MockAppWindowManager from '../../test/mocks/mock_app_window_manager';
import '../../test/mocks/navigator/telephony';
import '../../test/mocks/mock_appOrigin';
import MockApplications from '../../test/mocks/mock_applications';
import SoftKeyStore from 'soft-key-store';
import NotificationStore from '../notification_store';

Enzyme.configure({ adapter: new Adapter()});

jest.mock('../enhance_animation', () => {
  return {
    __esModule: true,
    default: (ComposedComponent) => { return ComposedComponent; }
  }
});

jest.mock('../notification_store', () => {
  return {
    __esModule: true,
    default: { resetNewComingCount:jest.fn() }
  }
});

jest.mock('../util/utils', () => {
  return {
    toL10n: (val) => {return val}
  }
});

jest.mock('../clock');
jest.mock('../lockscreen/simcard_info');
jest.mock('../lockscreen/lockmode_pocket');
jest.mock('../lockscreen/passcode');
jest.mock('../lockscreen/passcode_remote_lock');
jest.mock('../lockscreen/device_financing_lock');
jest.mock('soft-key-store');

describe('<LockscreenView /> component test', () => {
  let wrapper = null;
  let instance = null;
  let launchappCallback = jest.fn();
  const observeSpy = jest.spyOn(SettingsObserver, 'observe');
  beforeAll(done => {
    wrapper = mount(<LockscreenView />);
    instance = wrapper.instance();
    done();
  });

  test('<LockscreenView /> dom render test', done => {
    expect(toJson(wrapper)).toMatchSnapshot();
    expect(instance.element).not.toBeNull();
    // constructor expectations
    expect(wrapper.state()).toEqual({
      "deviceFinancingLockStatus": false,
      "lockEnabled": false,
      "mode": "none",
      "notificationEnabled": true,
      "remoteLockEnabled": false
    });
    expect(typeof instance.unlock).toBe('function');
    expect(typeof instance.pocketUnlocked).toBe('function');
    expect(typeof instance.passcodeUnlocked).toBe('function');
    expect(typeof instance.remotePasscodeUnlocked).toBe('function');
    expect(typeof instance.handleSecurAppClosed).toBe('function');
    expect(instance.remoteLockEnabled).toBeFalsy();
    // componentDidMount expectations
    // 1. _init function expectations
    expect(Service.request).toBeCalledTimes(1);
    expect(Service.request.mock.calls[0][0]).toEqual('registerHierarchy');
    expect(Service.registerState).toBeCalledTimes(5);
    expect(Service.registerState.mock.calls[0][0]).toEqual('locked');
    expect(Service.registerState.mock.calls[1][0]).toEqual('isPocketMode');
    expect(Service.registerState.mock.calls[2][0]).toEqual('isDMLockMode');
    expect(Service.registerState.mock.calls[3][0]).toEqual('remoteLockEnabled');
    expect(Service.registerState.mock.calls[4][0]).toEqual('wrongPasscodeInfo');
    expect(Service.register).toBeCalledTimes(2);
    expect(Service.register.mock.calls[0][0]).toEqual('lock');
    expect(Service.register.mock.calls[1][0]).toEqual('unlock');
    expect(observeSpy).toBeCalledTimes(8);
    expect(observeSpy.mock.calls[0][0]).toEqual('lockscreen.wrong.code.info');
    expect(observeSpy.mock.calls[1][0]).toEqual('lockscreen.unlocked');
    expect(observeSpy.mock.calls[2][0]).toEqual('lockscreen.enabled');
    expect(observeSpy.mock.calls[3][0]).toEqual('lockscreen.lock-immediately');
    expect(observeSpy.mock.calls[4][0]).toEqual('lockscreen.notifications-preview.enabled');
    expect(observeSpy.mock.calls[5][0]).toEqual('lockscreen.remote-lock');
    expect(observeSpy.mock.calls[6][0]).toEqual('pocketmode.autolock.enabled');
    expect(observeSpy.mock.calls[7][0]).toEqual('dm.lockscreen.passcode-lock.code');
    // 2. componentDidMount self function expectations
    expect(instance.isPocketDevice).toBeTruthy();
    expect(SoftKeyStore.register).toBeCalledTimes(2);
    expect(instance.lastElement).toBe(instance.element);
    done();
  });

  test('render function test', done => {
    jest.spyOn(instance, 'componentDidUpdate').mockImplementation(() => {});
    // this.state.mode == 'none'
    wrapper.setState({ mode: 'none'});
    wrapper.update();
    expect(toJson(wrapper)).toMatchSnapshot();
    // this.state.mode == 'pocket'
    wrapper.setState({ mode: 'pocket'});
    wrapper.update();
    expect(toJson(wrapper)).toMatchSnapshot();
    // this.state.mode == 'passcode'
    wrapper.setState({ mode: 'passcode'});
    wrapper.update();
    expect(toJson(wrapper)).toMatchSnapshot();
    // this.state.mode == 'remotePasscode'
    wrapper.setState({ mode: 'remotePasscode'});
    wrapper.update();
    expect(toJson(wrapper)).toMatchSnapshot();
    // this.state.mode == 'deviceFinancingLocked'
    wrapper.setState({ mode: 'deviceFinancingLocked'});
    wrapper.update();
    expect(toJson(wrapper)).toMatchSnapshot();
    done();
  });

  test('componentDidUpdate function test', done => {
    const updateSoftKeysSpy = jest.spyOn(instance, 'updateSoftKeys').mockImplementation(() => {});
    const _toggleLockedSettingSpy = jest.spyOn(instance, '_toggleLockedSetting').mockImplementation(() => {});
    const _clearDMLockedSettingsSpy = jest.spyOn(instance, '_clearDMLockedSettings').mockImplementation(() => {});
    global.requestAnimationFrame = function (callback) {
      callback();
    };
    // this.state.mode == 'none'
    wrapper.setState({ mode: 'none' });
    expect(screen.orientation.lock).toBeCalledTimes(1);
    expect(_toggleLockedSettingSpy).toBeCalledTimes(1);
    expect(_clearDMLockedSettingsSpy).toBeCalledTimes(1);
    expect(updateSoftKeysSpy).toBeCalledTimes(1);

    jest.clearAllMocks();
    // this.state.mode is not none
    wrapper.setState({ mode: 'remotePasscode', remoteLockEnabled: true });
    expect(screen.orientation.lock).toBeCalledTimes(1);
    expect(Service.request).toBeCalledTimes(1);
    expect(_toggleLockedSettingSpy).toBeCalledTimes(1);
    expect(updateSoftKeysSpy).toBeCalledTimes(1);

    expect(instance.lastOrientationType).toBe(screen.orientation.type);
    done();
  });

  test('setHierarchy function test', done => {
    const updateSoftKeysSpy = jest.spyOn(instance, 'updateSoftKeys').mockImplementation(() => {});
    instance.setHierarchy();
    expect(SoftKeyStore.unregister).toBeCalledTimes(1);
    instance.setHierarchy(true);
    expect(updateSoftKeysSpy).toBeCalledTimes(1);
    done();
  });

  test('_handle_timechange function test', done => {
    const setValueSpy = jest.spyOn(SettingsObserver, 'setValue');
    const oldWrongPasscodeInfo = instance.wrongPasscodeInfo;
    instance.wrongPasscodeInfo = {errorTimes: '11'};
    instance._handle_timechange();
    expect(setValueSpy).toBeCalledTimes(1);
    instance.wrongPasscodeInfo = oldWrongPasscodeInfo;
    done();
  });

  test('_observe_lockscreen.wrong.code.info function test', done => {
    instance['_observe_lockscreen.wrong.code.info']({errorTimes: 111, retryTimestamp: 222});
    expect(instance.wrongPasscodeInfo).toEqual({"errorTimes": 111, "retryTimestamp": 222});
    instance['_observe_lockscreen.wrong.code.info']();
    expect(instance.wrongPasscodeInfo).toEqual({"errorTimes": 0, "retryTimestamp": 0});
    done();
  });

  test('_observe_lockscreen.unlocked function test', done => {
    jest.spyOn(instance, 'componentDidUpdate').mockImplementation(() => {});
    instance['_observe_lockscreen.unlocked'](true);
    expect(wrapper.state().mode).toBe("none");
    done();
  });

  test('_observe_lockscreen.enabled function test', done => {
    jest.spyOn(instance, 'componentDidUpdate').mockImplementation(() => {});
    const lockIfEnabledSpy = jest.spyOn(instance, 'lockIfEnabled').mockImplementation(() => {});
    instance.firstLaunch = true;
    SettingsObserver.setValue([{
      name: 'lockscreen.enabled',
      value: true
    }]);
    expect(wrapper.state().lockEnabled).toBeTruthy();
    expect(lockIfEnabledSpy).toBeCalledTimes(1);
    expect(instance.firstLaunch).toBeFalsy();
    done();
  });

  test('_observe_lockscreen.notifications-preview.enabled function test', done => {
    jest.spyOn(instance, 'componentDidUpdate').mockImplementation(() => {});
    instance['_observe_lockscreen.notifications-preview.enabled'](true);
    expect(wrapper.state().notificationEnabled).toBeTruthy();
    done();
  });

  test('_observe_lockscreen.lock-immediately function test', done => {
    jest.resetAllMocks();
    const lockIfEnabledSpy = jest.spyOn(instance, 'lockIfEnabled').mockImplementation(() => {});
    instance['_observe_lockscreen.lock-immediately'](true);
    expect(lockIfEnabledSpy).toBeCalledTimes(1);
    expect(Service.request).toBeCalledTimes(1);
    expect(Service.request.mock.calls[0]).toEqual(["turnScreenOn", "lock-immediately"]);
    done();
  });

  test('_observe_pocketmode.autolock.enabled function test', done => {
    instance['_observe_pocketmode.autolock.enabled']();
    expect(instance.autoLockEnabled).toBeTruthy();
    done();
  });

  test('_observe_lockscreen.remote-lock function test', done => {
    jest.resetAllMocks();
    jest.spyOn(instance, 'componentDidUpdate').mockImplementation(() => {});
    const setModeSpy = jest.spyOn(instance, 'setMode').mockImplementation(() => {});
    instance['_observe_lockscreen.remote-lock'](['', true]);
    expect(instance.remoteLockEnabled).toBeTruthy();
    expect(wrapper.state().remoteLockEnabled).toBeTruthy();
    expect(setModeSpy).toBeCalledTimes(1);
    expect(setModeSpy.mock.calls[0][0]).toEqual("remotePasscode");
    expect(Service.request).toBeCalledTimes(1);
    expect(Service.request.mock.calls[0]).toEqual(["turnScreenOn", "remote-lock"]);
    done();
  });

  test('_observe_dm.lockscreen.passcode-lock.code function test', async done => {
    const setValueSpy = jest.spyOn(SettingsObserver, 'setValue');
    const setModeSpy = jest.spyOn(instance, 'setMode').mockImplementation(() => {});
    const _hangUpAllCallsSpy = jest.spyOn(instance, '_hangUpAllCalls').mockImplementation(() => {});
    const _killAllAppsSpy = jest.spyOn(instance, '_killAllApps').mockImplementation(() => {});
    // value is true && this.autoLockEnabled is true
    instance.autoLockEnabled = true;
    await SettingsObserver.setValue([{
      name: 'dm.lockscreen.passcode-lock.code',
      value: true
    }]);
    expect(setValueSpy).toBeCalledTimes(6);
    expect(setModeSpy).toBeCalledTimes(1);
    expect(setModeSpy).toHaveBeenCalledWith("pocket");
    expect(_hangUpAllCallsSpy).toBeCalledTimes(1);
    expect(_killAllAppsSpy).toBeCalledTimes(1);
    // value is true && this.autoLockEnabled is false
    instance.autoLockEnabled = false;
    await instance['_observe_dm.lockscreen.passcode-lock.code'](true);
    expect(setModeSpy).toHaveBeenCalledWith("passcode");

    // value is false
    instance.state.mode = 'passcode';
    await instance['_observe_dm.lockscreen.passcode-lock.code']();
    expect(instance.dmLock).toBeFalsy();
    expect(setModeSpy).toHaveBeenCalledWith("none");
    done();
  });

  test('lockIfEnabled function test', done => {
    const setModeSpy = jest.spyOn(instance, 'setMode').mockImplementation(() => {});
    // this.state.deviceFinancingLockStatus is true
    instance.state.deviceFinancingLockStatus = true;
    instance.lockIfEnabled();
    expect(setModeSpy).toHaveBeenCalledWith("deviceFinancingLocked");
    // this.state.remoteLockEnabled is true
    instance.state.deviceFinancingLockStatus = false;
    instance.state.remoteLockEnabled = true;
    instance.lockIfEnabled();
    expect(setModeSpy).toHaveBeenCalledWith("remotePasscode");
    // this.state.lockEnabled is true
    instance.state.deviceFinancingLockStatus = false;
    instance.state.remoteLockEnabled = false;
    instance.state.lockEnabled = true;
    instance.lockIfEnabled();
    expect(setModeSpy).toHaveBeenCalledWith("passcode");
    done();
  });

  test('updateSoftKeys function test', done => {
    // this.state.mode is 'deviceFinancingLocked'
    instance.state.mode = 'deviceFinancingLocked';
    instance.updateSoftKeys();
    expect(SoftKeyStore.register).toHaveBeenCalledWith({"center": "", "left": "emergency-call", "right": "df-mymobill"}, instance.element);
    // this.state.mode is 'passcode'
    instance.state.mode = 'passcode';
    instance.updateSoftKeys();
    expect(SoftKeyStore.register).toHaveBeenCalledWith({"center": "", "left": "emergency-call", "right": "camera"}, instance.element);
    // this.state.mode is 'remotePasscode'
    instance.state.mode = 'remotePasscode';
    instance.updateSoftKeys();
    expect(SoftKeyStore.register).toHaveBeenCalledWith({"center": "", "left": "emergency-call", "right": ""}, instance.element);
    done();
  });

  test('_handle_device-lock-state-update function test', done => {
    const setModeSpy = jest.spyOn(instance, 'setMode').mockImplementation(() => {});
    const lockIfEnabledSpy = jest.spyOn(instance, 'lockIfEnabled').mockImplementation(() => {});
    jest.spyOn(Service, 'query').mockReturnValueOnce(false).mockReturnValueOnce(true);
    // status is false
    instance.state.deviceFinancingLockStatus = true;
    instance['_handle_device-lock-state-update']();
    expect(instance.state.deviceFinancingLockStatus).toBeFalsy();
    expect(setModeSpy).toHaveBeenCalledWith("none");
    expect(lockIfEnabledSpy).toBeCalledTimes(1);
    // status is true
    instance.state.deviceFinancingLockStatus = false;
    instance['_handle_device-lock-state-update']();
    expect(instance.state.deviceFinancingLockStatus).toBeTruthy();
    expect(setModeSpy).toHaveBeenCalledWith("deviceFinancingLocked");
    done();
  });

  test('_handle_beforescreenoff function test', done => {
    const setModeSpy = jest.spyOn(instance, 'setMode').mockImplementation(() => {});

    // evt.detail.screenOffBy == 'proximity'
    const evt = {
      detail: {
        screenOffBy: 'proximity'
      }
    };
    instance._handle_beforescreenoff(evt);

    // this.state.remoteLockEnabled is true
    instance.state.remoteLockEnabled = true;
    instance._handle_beforescreenoff({detail: ''});
    expect(setModeSpy).toHaveBeenCalledWith("remotePasscode");

    // this.isPocketDevice && (this.autoLockEnabled || this.isPocketMode()) == true
    instance.state.remoteLockEnabled = false;
    instance.isPocketDevice = true;
    instance.autoLockEnabled = true;
    instance._handle_beforescreenoff({detail: ''});
    expect(setModeSpy).toHaveBeenCalledWith("pocket");

    // this.state.deviceFinancingLockStatus is true
    instance.state.remoteLockEnabled = false;
    instance.isPocketDevice = false;
    instance.state.deviceFinancingLockStatus = true;
    instance._handle_beforescreenoff({detail: ''});
    expect(setModeSpy).toHaveBeenCalledWith("deviceFinancingLocked");

    // this.state.lockEnabled is true
    instance.state.remoteLockEnabled = false;
    instance.isPocketDevice = false;
    instance.state.deviceFinancingLockStatus = false;
    instance.state.lockEnabled = true;
    instance._handle_beforescreenoff({detail: ''});
    expect(setModeSpy).toHaveBeenCalledWith("passcode");

    // else mode = 'none';
    instance.state.remoteLockEnabled = false;
    instance.isPocketDevice = false;
    instance.state.deviceFinancingLockStatus = false;
    instance.state.lockEnabled = false;
    instance._handle_beforescreenoff({detail: ''});
    expect(setModeSpy).toHaveBeenCalledWith("none");
    done();
  });

  test('_toggleLockedSetting function test', done => {
    instance.state.lockEnabled = true;
    const setValueSpy = jest.spyOn(SettingsObserver, 'setValue');
    instance._toggleLockedSetting(true);
    expect(setValueSpy).toHaveBeenCalledWith([{"name": "lockscreen.locked", "value": true}]);
    done();
  });

  test('_clearDMLockedSettings function test', done => {
    instance.dmLock = true;
    const setValueSpy = jest.spyOn(SettingsObserver, 'setValue');
    instance._clearDMLockedSettings();
    expect(setValueSpy).toHaveBeenCalledWith([
      {"name": "dm.lockscreen.passcode-lock.code", "value": ""},
      {"name": "lockscreen.passcode-lock.enabled", "value": false}
    ]);
    expect(instance.dmLock).toBeFalsy();
    done();
  });

  test('_killAllApps function test', done => {
    const apps = [
      {
        'id1': { 'isHomescreen': false, manifestUrl: 'id1' }
      },
      {
        'id2': { 'isHomescreen': false, manifestUrl: 'id2' }
      }
    ];
    window.appWindowManager = MockAppWindowManager;
    appWindowManager.getApps = jest.fn(() => {return apps});
    appWindowManager.kill = jest.fn();
    instance._killAllApps();
    expect(appWindowManager.kill).toBeCalledTimes(2);
    done();
  });

  test('_hangUpAllCalls function test', done => {
    const hangUpCB = jest.fn();
    navigator.b2g.telephony.calls = [{ hangUp: hangUpCB }, { hangUp: hangUpCB }];
    navigator.b2g.telephony.conferenceGroup.calls = [{ }, { }];
    navigator.b2g.telephony.conferenceGroup.hangUp = hangUpCB;
    instance._hangUpAllCalls();
    expect(hangUpCB).toBeCalledTimes(3);
    done();
  });

  test('onKeyDown function test', done => {
    const setModeSpy = jest.spyOn(instance, 'setMode').mockImplementation(() => {});
    instance.isPocketDevice = true;
    instance.state.mode = 'none';
    instance.autoLockEnabled = true;
    instance.state.remoteLockEnabled = false;
    const evt = { key: 'EndCall' };
    wrapper.find('#lockscreen-view').simulate('keydown', evt);
    expect(setModeSpy).toHaveBeenCalledWith('pocket');
    done();
  });

  test('focus function test', done => {
    const focusCB = jest.fn();
    instance.activeLock = { focus: focusCB };
    instance.focus();
    expect(focusCB).toBeCalledTimes(1);
    done();
  });

  test('lock function test', done => {
    const setModeSpy = jest.spyOn(instance, 'setMode').mockImplementation(() => {});
    jest.spyOn(instance, '_ensureLockable').mockReturnValueOnce(true);
    instance.state.mode = 'none';
    instance.lock();
    expect(setModeSpy).toHaveBeenCalledWith('pocket');
    done();
  });

  test('pocketUnlocked function test', done => {
    const setModeSpy = jest.spyOn(instance, 'setMode').mockImplementation(() => {});
    jest.spyOn(instance, '_ensureLockable').mockReturnValue(true);
    // this.state.deviceFinancingLockStatus is true
    instance.state.deviceFinancingLockStatus = true;
    instance.pocketUnlocked();
    expect(setModeSpy).toHaveBeenCalledWith('deviceFinancingLocked');

    // this.state.lockEnabled is true
    instance.state.deviceFinancingLockStatus = false;
    instance.state.lockEnabled = true;
    instance.pocketUnlocked();
    expect(setModeSpy).toHaveBeenCalledWith('passcode');

    // else
    instance.state.deviceFinancingLockStatus = false;
    instance.state.lockEnabled = false;
    instance.pocketUnlocked();
    expect(setModeSpy).toHaveBeenCalledWith('none');
    expect(NotificationStore.resetNewComingCount).toBeCalledTimes(3);
    done();
  });

  test('_ensureLockable function test', done => {
    jest.spyOn(Service, 'query').mockReturnValue({name: 'AppWindowManager', isHomescreen: true});
    const bool = instance._ensureLockable();
    expect(bool).toBeTruthy();
    done();
  });

  test('passcodeUnlocked function test', done => {
    const setModeSpy = jest.spyOn(instance, 'setMode').mockImplementation(() => {});
    instance.passcodeUnlocked();
    expect(setModeSpy).toHaveBeenCalledWith('none');
    done();
  });

  test('remotePasscodeUnlocked function test', done => {
    const setModeSpy = jest.spyOn(instance, 'setMode').mockImplementation(() => {});
    // this.state.lockEnabled is true
    instance.state.lockEnabled = true;
    instance.remotePasscodeUnlocked();
    expect(setModeSpy).toHaveBeenCalledWith('passcode');
    // this.state.lockEnabled is false
    instance.state.lockEnabled = false;
    instance.remotePasscodeUnlocked();
    expect(setModeSpy).toHaveBeenCalledWith('none');
    done();
  });

  test('locked function test', done => {
    const bool = instance.locked();
    expect(bool).toBeTruthy();
    done();
  });

  test('isPocketMode function test', done => {
    instance.state.mode = 'none';
    const bool = instance.isPocketMode();
    expect(bool).toBeFalsy();
    instance.state.mode = 'pocket';
    const bool1 = instance.isPocketMode();
    expect(bool1).toBeTruthy();
    done();
  });

  test('isDMLockMode function test', done => {
    instance.dmLock = false;
    const bool = instance.isDMLockMode();
    expect(bool).toBeFalsy();
    instance.dmLock = true;
    const bool1 = instance.isDMLockMode();
    expect(bool1).toBeTruthy();
    done();
  });

  test('setMode function test', done => {
    jest.spyOn(instance, 'componentDidUpdate').mockImplementation(() => {});
    const setValueSpy = jest.spyOn(SettingsObserver, 'setValue');
    instance.setMode('pocket');
    expect(setValueSpy).toHaveBeenCalledWith([{"name": "lockscreen.mode", "value": "pocket"}]);
    expect(wrapper.state().mode).toBe('pocket');
    done();
  });

  test('invokeSecureApp function test', done => {
    global.applications = MockApplications;
    jest.spyOn(Service, 'query').mockReturnValueOnce(false);
    jest.spyOn(applications, 'getByManifestURL').mockReturnValueOnce({status: 0});
    window.addEventListener('secure-launchapp', launchappCallback);
    instance.invokeSecureApp('camera');
    expect(launchappCallback).toBeCalledTimes(1);
    expect(instance.appOpening).toBeTruthy();

    // handleSecurAppClosed function test
    window.dispatchEvent(new CustomEvent('secure-appclosed'));
    expect(instance.appOpening).toBeFalsy();
    done();
  });

  afterEach(done => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });

  afterAll(done => {
    wrapper.unmount();
    window.removeEventListener('secure-launchapp', launchappCallback);
    done();
  });
});
