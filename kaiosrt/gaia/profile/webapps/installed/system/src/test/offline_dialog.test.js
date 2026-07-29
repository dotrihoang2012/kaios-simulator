/* eslint-disable no-undef */
import React from 'react';
import Enzyme from 'enzyme';
import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import Adapter from 'enzyme-adapter-react-15.4';
import "../../test/mocks/mock_appOrigin";
import "../../test/mocks/l10n";
import "../../test/mocks/simslot_manager";
import "../../test/mocks/service";
import "../../test/mocks/SettingsObserver";
import "../../test/mocks/statusbar";
import "../../test/mocks/navigator/wifiManager";
import BaseComponent from 'base-component';
import OfflineDialog from "../offline_dialog";

Enzyme.configure({ adapter: new Adapter()});

describe('<OfflineDialog /> component test', () => {
  let wrapper = null;
  let instance = null;
  beforeAll(done => {
    jest.spyOn(SIMSlotManager, 'getSlots').mockReturnValue([]);
    wrapper = mount(<OfflineDialog />);
    instance = wrapper.instance();
    done();
  });

  test('<OfflineDialog /> mount test', done => {
    expect(wrapper.state()).toEqual({"active": false});
    expect(Service.register).toBeCalledTimes(2);
    expect(Service.register.mock.calls[0][0]).toEqual('show');
    expect(Service.register.mock.calls[1][0]).toEqual('hide');
    expect(Service.request).toBeCalledTimes(1);
    expect(Service.request.mock.calls[0][0]).toEqual('registerHierarchy');
    expect(instance.enabled).toBeTruthy();
    done();
  });

  describe('component functions of needed dom test', () => {
    beforeAll(done => {
      jest.mock('base-component');
      BaseComponent.prototype.publish = jest.fn();
      jest.spyOn(SIMSlotManager, 'getSlots').mockReturnValue([]);
      document.body.innerHTML = '<div id="statusbar" class="fullscreen"></div>';
      global.StatusBar.element = document.getElementById('statusbar');
      jest.spyOn(Service, 'query').mockReturnValue({instanceID: 'test_instanceID'});
      instance.enabled = true;
      const app = {
        isBrowserOrSearch: jest.fn(),
        manifestUrl: window.AppOrigin.getManifestURL('kaios-weather')
      };
      instance.show(app);
      wrapper.update();
      done();
    });

    test('show function expectations test', done => {
      expect(wrapper.state()).toEqual({"active": true});
      expect(toJson(wrapper)).toMatchSnapshot();
      expect(instance.container).not.toBeUndefined();
      expect(instance.readDom).not.toBeUndefined();
      expect(instance.header).not.toBeUndefined();
      expect(instance.buttons.length).toBe(1);
      done();
    });

    test('focus function test', done => {
      jest.spyOn(HTMLDivElement.prototype, 'focus').mockImplementation(() => {});
      instance.focus();
      expect(HTMLDivElement.prototype.focus).toBeCalledTimes(1);
      expect(instance.buttons[instance.focusIndex].classList.contains('active')).toBeTruthy();
      done();
    });

    test('setHierarchy function test', done => {
      const focusSpy = jest.spyOn(instance, 'focus').mockImplementation(() => {});
      instance.setHierarchy(true);
      expect(focusSpy).toBeCalledTimes(1);
      done();
    });

    test('onButtonProcess function test', async done => {
      const gotoWifiListSpy = jest.spyOn(instance, 'gotoWifiList').mockImplementation(() => {});
      global.Wifi = { wifiEnabled: false };
      await instance.onButtonProcess();
      expect(gotoWifiListSpy).toBeCalledTimes(1);
      done();
    });

    test('isActive function test', done => {
      const isActive = instance.isActive();
      expect(isActive).toBeTruthy();
      done();
    });

    test('onKeyDown function test', async done => {
      jest.useFakeTimers();
      const hideSpy = jest.spyOn(instance, 'hide').mockImplementation(() => {});
      const onButtonProcessSpy = jest.spyOn(instance, 'onButtonProcess').mockImplementation(() => {});
      const evt = { key: 'SoftLeft' };
      wrapper.find('#offline-dialog').childAt(0).simulate('keyDown', evt);
      expect(hideSpy).toBeCalledTimes(1);

      const evt1 = { key: 'ArrowDown' };
      wrapper.find('#offline-dialog').childAt(0).simulate('keyDown', evt1);

      const evt2 = { key: 'Enter' };
      wrapper.find('#offline-dialog').childAt(0).simulate('keyDown', evt2);
      expect(onButtonProcessSpy).toBeCalledTimes(0);
      jest.advanceTimersByTime(500);
      expect(onButtonProcessSpy).toBeCalledTimes(1);
      done();
    });

    test('hide function test', done => {
      jest.spyOn(SIMSlotManager, 'getSlots').mockReturnValue([]);
      wrapper.find('#offline-dialog').childAt(0).simulate('blur');
      expect(wrapper.state()).toEqual({"active": false});
      done();
    });
  });

  test('initSettingsObserve function test', done => {
    jest.spyOn(global.SettingsObserver, 'observe')
      .mockImplementation((key, defaultValue, callback) => {
        callback(defaultValue);
      });
    const updateButtonsSpy = jest.spyOn(instance, 'updateButtons').mockImplementation(() => {});
    instance.initSettingsObserve();
    expect(instance.config.dmDataEnabled).toBeTruthy();
    expect(instance.config.simConfigDataEnabled).toBeTruthy();
    expect(instance.config.dmWifiEnabled).toBeTruthy();
    expect(instance.config.simConfigWifiEnabled).toBeTruthy();
    expect(updateButtonsSpy).toBeCalledTimes(4);
    done();
  });

  test('updateButtons function test', done => {
    instance.state.active = false;
    instance.updateButtons();
    expect(instance.dataButton).toBeTruthy();
    expect(instance.wifiButton).toBeTruthy();
    done();
  });

  test('clear function test', done => {
    jest.spyOn(SIMSlotManager, 'getSlots').mockReturnValue([]);
    instance.clear();
    expect(wrapper.state()).toEqual({"active": false});
    done();
  });

  test('clearCheck function test', done => {
    const clearSpy = jest.spyOn(instance, 'clear').mockImplementation(() => {});
    instance.instanceID = 'test_instanceID';
    const evt = {
      detail: { instanceID: 'test_instanceID'}
    };
    instance.clearCheck(evt);
    expect(clearSpy).toBeCalledTimes(1);
    done();
  });

  test('_handle_appterminated function test', done => {
    const clearCheckSpy = jest.spyOn(instance, 'clearCheck').mockImplementation(() => {});
    const evt = {};
    instance._handle_appterminated(evt);
    expect(clearCheckSpy).toBeCalledTimes(1);
    done();
  });

  test('_handle_activityterminated function test', done => {
    const clearCheckSpy = jest.spyOn(instance, 'clearCheck').mockImplementation(() => {});
    const evt = {};
    instance._handle_activityterminated(evt);
    expect(clearCheckSpy).toBeCalledTimes(1);
    done();
  });

  test('isSimRegisted function test', done => {
    const simSlot = {
      conn: {
        voice: { connected: false },
        data: { connected: {state: 'registered'} },
        radioState: true
      },
      isAbsent: jest.fn(),
      isLocked: jest.fn()
    };
    jest.spyOn(SIMSlotManager, 'getSlots').mockReturnValue([simSlot]);
    const isSimRegisted = instance.isSimRegisted();
    expect(isSimRegisted).toBeTruthy();
    done();
  });

  test('gotoWifiList function test', done => {
    const WebActivity = jest.fn();
    WebActivity.prototype.start = jest.fn();
    window.WebActivity = WebActivity;
    const hideSpy = jest.spyOn(instance, 'hide').mockImplementation(() => {});
    instance.gotoWifiList();
    expect(hideSpy).toBeCalledTimes(1);
    expect(WebActivity.prototype.start).toHaveBeenCalledTimes(1);
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
    document.body.innerHTML = '';
    global.Wifi = undefined;
    done();
  });
});
