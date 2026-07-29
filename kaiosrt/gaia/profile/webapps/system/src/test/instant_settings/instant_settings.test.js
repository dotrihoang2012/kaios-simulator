import React from 'react';
import Enzyme from 'enzyme';
import { mount } from 'enzyme';
import toJson from "enzyme-to-json";
import Adapter from "enzyme-adapter-react-15.4";
import SoftKeyStore from 'soft-key-store';

import '../../../test/mocks/simslot_manager';
import '../../../test/mocks/DeviceCapabilityManager';
import '../../../test/mocks/navigator/getFlashlightManager';
import '../../../test/mocks/l10n';
import '../../../test/mocks/SettingsObserver';
import '../../../test/mocks/service';
import '../../../test/mocks/mock_appOrigin';
import '../../../test/mocks/AppsManager';
import '../../../test/mocks/navigator/getFlashlightManager';
import '../../../test/mocks/navigator/bluetooth';

import * as utils from '../../util/utils';
import IS_flashlight from '../../instant_settings/is_flashlight';
import IS_network from '../../instant_settings/is_network';
import IS_volume from '../../instant_settings/is_volume';
import IS_wifi from '../../instant_settings/is_wifi';
import IS_airplanemode from '../../instant_settings/is_airplanemode';
import IS_bluetooth from '../../instant_settings/is_bluetooth';
import IS_keypad_lock from '../../instant_settings/is_keypad_lock';
import InstantSettingsStore from '../../instant_settings/instant_settings_store';
import InstantSettings from '../../instant_settings/instant_settings';

Enzyme.configure({ adapter: new Adapter()});

jest.mock('../../enhance_animation', () => {
  return {
    __esModule: true,
    default: (ComposedComponent) => { return ComposedComponent; }
  }
});
global.SoundManager = {
  MAX_VOLUME: {
    'content': 15,
    'notification': 15
  }
};
global.soundManager = {
  currentVolume: {
    'content': 5,
    'notification': 5
  },
  vibrationEnabled: true,
  getChannel: () => 'notification',
  toggleVibrate: jest.fn(),
  changeVolume: jest.fn(),
  enterSilentMode: jest.fn(),
  leaveSilentMode: jest.fn(),
  setMute: jest.fn()
};

describe('<InstantSettings /> component test', () => {
  let wrapper = null;
  let instance = null;
  beforeAll(() => {
    wrapper = mount(<InstantSettings />);
    instance = wrapper.instance();
    expect(Service.register.mock.calls[0][0]).toEqual('exit');
    expect(instance.element).not.toBeUndefined();
    expect(toJson(wrapper)).toMatchSnapshot();
  });
  beforeEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    jest.spyOn(Service, 'register');
    jest.spyOn(SoftKeyStore, 'unregister')
      .mockImplementation(() => {});
    jest.spyOn(SoftKeyStore, 'register')
      .mockImplementation(() => {});
  });

  test('<InstantSettings /> show/hide test', async () => {
    instance.hide();
    expect(instance.isActive()).toBe(false);
    instance.show();
    expect(instance.isActive()).toBe(true);

    instance.setHierarchy(false);
    expect(Service.request.mock.calls[0]).toEqual(['InstantSettings:exit']);

    document.activeElement.blur();
    jest.spyOn(instance, 'updateSettings');
    instance.setHierarchy(true);
    expect(instance.updateSettings).toBeCalledTimes(1);
  });

  test('<InstantSettings /> onkeydown test', async () => {
    // default is the lastet item, volume bar. (raw: 3, col: 0)
    expect(instance.state.focusIndex).toBe(6);

    await wrapper.find('.instantSettings').simulate('keydown', { key: 'ArrowUp'});
    // move to raw: 2, col: 0
    expect(instance.state.focusIndex).toBe(3);

    await wrapper.find('.instantSettings').simulate('keydown', { key: 'Enter'});

    await wrapper.find('.instantSettings').simulate('keydown', { key: 'ArrowRight'});
    // move to raw: 2, col: 1
    expect(instance.state.focusIndex).toBe(4);

    await wrapper.find('.instantSettings').simulate('keydown', { key: 'ArrowLeft'});
    // move to raw: 2, col: 0,
    expect(instance.state.focusIndex).toBe(3);

    await wrapper.find('.instantSettings').simulate('keydown', { key: 'ArrowDown'});
    // move to raw: 3, col: 0,
    expect(instance.state.focusIndex).toBe(6);

    await wrapper.find('.instantSettings').simulate('keydown', { key: 'EndCall'});
    expect(Service.request.mock.calls[0]).toEqual(['InstantSettings:close']);
  });

  test('<InstantSettings /> volume bar test', async () => {
    // click volum bar, setMute
    await wrapper.find('.instantSettings').simulate('keydown', { key: 'Enter'});
    expect(soundManager.setMute).toBeCalledTimes(1);

    await wrapper.find('.instantSettings').simulate('keydown', { key: 'ArrowRight'});
    expect(soundManager.changeVolume.mock.calls[0]).toEqual([1]);

    await wrapper.find('.instantSettings').simulate('keydown', { key: 'ArrowLeft'});
    expect(soundManager.changeVolume.mock.calls[1]).toEqual([-1]);

    utils.isLandscape = true;
    await wrapper.find('.instantSettings').simulate('keydown', { key: 'ArrowUp'});
    expect(soundManager.changeVolume.mock.calls[2]).toEqual([1]);

    await wrapper.find('.instantSettings').simulate('keydown', { key: 'ArrowDown'});
    expect(soundManager.changeVolume.mock.calls[3]).toEqual([-1]);
    utils.isLandscape = false

    IS_volume.config.value = 10;
    await wrapper.find('.instantSettings').simulate('keydown', { key: 'Enter'});
    expect(soundManager.toggleVibrate).toBeCalledTimes(1);

    soundManager.getChannel = () => 'content';
    await wrapper.find('.instantSettings').simulate('keydown', { key: 'Enter'});
    expect(soundManager.enterSilentMode).toBeCalledTimes(1);

    IS_volume.config.value = 0;
    await wrapper.find('.instantSettings').simulate('keydown', { key: 'Enter'});
    expect(soundManager.leaveSilentMode).toBeCalledTimes(1);

    window.dispatchEvent(new CustomEvent('soundManagerUpdateValue'));
    expect(IS_volume.config.value).toEqual(5);

    soundManager.currentVolume['content'] = 0;
    window.dispatchEvent(new CustomEvent('soundManagerUpdateValue'));
    expect(IS_volume.config.subtitle).toEqual('silent');

    soundManager.vibrationEnabled = true;
    soundManager.currentVolume['notification'] = 0;
    soundManager.getChannel = () => 'notification';
    window.dispatchEvent(new CustomEvent('soundManagerUpdateValue'));
    expect(IS_volume.config.subtitle).toEqual('vibrate-only');
  });

  test('<InstantSettings /> wifi item test', async () => {
    jest.spyOn(SettingsObserver, 'setValue');
    await wrapper.find('.instantSettings').simulate('keydown', { key: 'ArrowUp'});
    await wrapper.find('.instantSettings').simulate('keydown', { key: 'Enter'});
    expect(SettingsObserver.setValue.mock.calls[0]).toEqual([[{
      'name': 'wifi.enabled', 'value': false
    }]]);

    await wrapper.find('.instantSettings').simulate('keydown', { key: 'Enter'});
    expect(SettingsObserver.setValue.mock.calls[1]).toEqual([[{
      'name': 'wifi.enabled', 'value': true
    }]]);
  });

  test('<InstantSettings /> data item test', async () => {
    IS_airplanemode.isUpdating = false;
    jest.spyOn(SettingsObserver, 'setValue');
    SIMSlotManager.getSlots = () => {
      return [{
        simCard: {},
        getCardState: () => 'ready'
      }];
    };
    IS_network._handle_voicechange();
    await wrapper.find('.instantSettings').simulate('keydown', { key: 'ArrowRight'});
    await wrapper.find('.instantSettings').simulate('keydown', { key: 'Enter'});
    expect(SettingsObserver.setValue.mock.calls[0]).toEqual([[{
      'name': 'ril.data.enabled', 'value': true
    }]]);

    await wrapper.find('.instantSettings').simulate('keydown', { key: 'Enter'});
    expect(SettingsObserver.setValue.mock.calls[1]).toEqual([[{
      'name': 'ril.data.enabled', 'value': false
    }]]);
  });

  test('<InstantSettings /> bluetooth item test', async () => {
    utils.toggleBluetooth = jest.fn(() => Promise.resolve());
    await wrapper.find('.instantSettings').simulate('keydown', { key: 'ArrowRight'});
    await wrapper.find('.instantSettings').simulate('keydown', { key: 'Enter'});
    expect(utils.toggleBluetooth.mock.calls[0]).toEqual(['enable']);

    IS_bluetooth.observeCallback(true);
    await wrapper.find('.instantSettings').simulate('keydown', { key: 'Enter'});
    expect(utils.toggleBluetooth.mock.calls[1]).toEqual(['disable']);

  });

  test('<InstantSettings /> APM item test', async () => {
    jest.spyOn(SettingsObserver, 'setValue');
    IS_airplanemode.observeCallback('enabled');
    await wrapper.find('.instantSettings').simulate('keydown', { key: 'ArrowUp'});
    await wrapper.find('.instantSettings').simulate('keydown', { key: 'Enter'});
    expect(SettingsObserver.setValue.mock.calls[0]).toEqual([[{
      'name': 'airplaneMode.enabled', 'value': false
    }]]);

    IS_airplanemode.observeCallback('disabled');
    await wrapper.find('.instantSettings').simulate('keydown', { key: 'Enter'});
    expect(SettingsObserver.setValue.mock.calls[1]).toEqual([[{
      'name': 'airplaneMode.enabled', 'value': true
    }]]);
  });

  test('<InstantSettings /> brightness item test', async () => {
    jest.spyOn(SettingsObserver, 'setValue');
    await wrapper.find('.instantSettings').simulate('keydown', { key: 'ArrowLeft'});
    await wrapper.find('.instantSettings').simulate('keydown', { key: 'Enter'});
    expect(SettingsObserver.setValue.mock.calls[0]).toEqual([[{
      'name': 'screen.brightness', 'value': 0.1
    }]]);

    await wrapper.find('.instantSettings').simulate('keydown', { key: 'Enter'});
    expect(SettingsObserver.setValue.mock.calls[1]).toEqual([[{
      'name': 'screen.brightness', 'value': 0.4
    }]]);
  });

  test('<InstantSettings /> FlashlightHelper item test', async () => {
    await wrapper.find('.instantSettings').simulate('keydown', { key: 'ArrowLeft'});
    jest.spyOn(IS_flashlight, 'updateValue');
    await wrapper.find('.instantSettings').simulate('keydown', { key: 'Enter'});
    expect(IS_flashlight.updateValue).toBeCalledTimes(1);
  });

  test('<InstantSettings /> JioInstantSettings test', async () => {
    Service.set('isJioInstantSettings', true);
    SettingsObserver.setValue([{
      name: 'jio.instantSettings.enabled',
      value: true
    }]);
    await instance.checkWhetherJioStyle();
    expect(instance.isJioInstantSettings).toBe(true);

    await wrapper.find('.instantSettings').simulate('keydown', { key: 'SoftRight'});
    expect(window.AppsManager.launch.mock.calls[0])
      .toEqual(['http://settings.localhost/manifest.webmanifest']);
  })

  test('<InstantSettings /> keypad item test', async () => {
    jest.spyOn(SettingsObserver, 'setValue');
    IS_keypad_lock.config.click();
    expect(SettingsObserver.setValue.mock.calls[0]).toEqual([[{
      'name': 'pocketmode.autolock.enabled', 'value': true
    }]]);

    IS_keypad_lock.observeCallback(true);
    IS_keypad_lock.config.click();
    expect(SettingsObserver.setValue.mock.calls[1]).toEqual([[{
      'name': 'pocketmode.autolock.enabled', 'value': false
    }]]);
  });

  test('<InstantSettings /> toggleAllObservers test', async () => {
    InstantSettingsStore.toggleAllObservers(false);
    expect(IS_airplanemode.hasObserver).toBe(false);
    expect(IS_network.hasObserver).toBe(false);
    expect(IS_volume.hasObserver).toBe(false);
    expect(IS_wifi.hasObserver).toBe(false);
    expect(IS_bluetooth.hasObserver).toBe(false);
  });
});
