import React from 'react';
import Enzyme from 'enzyme';
import { mount } from 'enzyme';
import toJson from "enzyme-to-json";
import Adapter from "enzyme-adapter-react-15.4";
import SoftKeyStore from 'soft-key-store';

import '../../test/mocks/l10n';
import '../../test/mocks/simslot_manager';
import '../../test/mocks/service';
import '../../test/mocks/mock_appOrigin';
import '../../test/mocks/navigator/vibrate';

import SimDialog from '../sim_dialog';

Enzyme.configure({ adapter: new Adapter()});

jest.spyOn(SoftKeyStore, 'register').mockImplementation(() => {});
jest.spyOn(SoftKeyStore, 'unregister').mockImplementation(() => {});

describe('<SimDialog /> component test', () => {
  let wrapper = null;
  let instance = null;
  let dialogInfo = {
    onClose: jest.fn,
    dialog: null,
    state: {
      slots: [{
        getCardState: jest.fn(() => 'pinRequired'),
        unlockCardLock: jest.fn(Promise.resolve())
      }],
      nckSkipButton: true,
      showAttentionInNck: false
    }
  };

  document.body.innerHTML = `
    <div id="sim-dialog-root">
      <div id="sim-lock-container" />
    </div>
  `

  beforeAll(() => {
    wrapper = mount(<SimDialog onClose={dialogInfo.onClose}
      ref={(dom)=>{dialogInfo.dialog=dom}} slot={dialogInfo.state.slots[0]}
      nckSkipButton={dialogInfo.state.nckSkipButton}
      showAttentionInNck={dialogInfo.state.showAttentionInNck}/>,
      { attachTo: document.getElementById('sim-dialog-root') });
    instance = wrapper.instance();
    instance.focus();
    expect(dialogInfo.dialog).not.toBe(null);
    expect(toJson(wrapper)).toMatchSnapshot();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.restoreAllMocks();
    jest.spyOn(window, 'dispatchEvent');
    jest.spyOn(instance, 'clearInput');
    jest.spyOn(SoftKeyStore, 'register').mockImplementation(() => {});
    jest.spyOn(SoftKeyStore, 'unregister').mockImplementation(() => {});

  });

  test('<SimDialog /> pin lock UI test', async () => {
    // test softleft key
    wrapper.find('.sim-dialog').simulate('keydown', { key: 'SoftLeft'});
    expect(window.dispatchEvent.mock.calls[0][0].type).toEqual('secure-launchapp');
    expect(instance.clearInput).toBeCalledTimes(1);

    // test input key
    jest.clearAllMocks();
    instance.pinInput.value = '666';
    instance.onInput();
    expect(SoftKeyStore.register).toBeCalledTimes(1);
    expect(SoftKeyStore.register.mock.calls[0][0])
      .toEqual({ 'left': 'emergency-call' });

    jest.clearAllMocks();
    instance.pinInput.value = '6666';
    instance.onInput();
    expect(SoftKeyStore.register).toBeCalledTimes(1);
    expect(SoftKeyStore.register.mock.calls[0][0])
      .toEqual({ 'left': 'emergency-call', 'right': 'verify-rsk' });

    // test unlock
    jest.clearAllMocks();
    jest.spyOn(dialogInfo.state.slots[0], 'unlockCardLock')
      .mockReturnValueOnce(Promise.resolve('error'))
      .mockReturnValueOnce(Promise.resolve());
    // test unlock error
    await wrapper.find('.sim-dialog').simulate('keydown', { key: 'SoftRight'});
    expect(instance.pinInput.value).toEqual('');
    expect(instance.state.errorName).toEqual('error');

    // test unlock success
    instance.pinInput.value = '6666';
    instance.onInput();
    await wrapper.find('.sim-dialog').simulate('keydown', { key: 'SoftRight'});
    expect(instance.unlockSimLock).toBe(false);
  });

  test('<SimDialog /> puk lock UI test', async () => {
    // test puk warning dialog
    dialogInfo.state.slots[0].getCardState = jest.fn(() => 'pukRequired');
    wrapper.setProps({ slot: dialogInfo.state.slots[0] });
    expect(SoftKeyStore.register.mock.calls[0][0])
      .toEqual({ 'left': 'emergency-call', 'right': 'enter-puk-rsk' });
    expect(toJson(wrapper)).toMatchSnapshot();

    // test softleft key
    jest.clearAllMocks();
    wrapper.find('.sim-dialog').simulate('keydown', { key: 'SoftLeft'});
    expect(window.dispatchEvent.mock.calls[0][0].type).toEqual('secure-launchapp');
    expect(instance.clearInput).toBeCalledTimes(1);
    expect(instance.state.showAttention).toBe(true);

    // test softright key
    jest.clearAllMocks();
    wrapper.find('.sim-dialog').simulate('keydown', { key: 'SoftRight'});
    expect(SoftKeyStore.register.mock.calls[0][0])
      .toEqual({ 'left': 'emergency-call' });
    expect(instance.state.showAttention).toBe(false);

    // test new pin input
    // pinUnmatch
    jest.clearAllMocks();
    expect(instance.state.unmatchPin).toBe(false);
    instance.pukInput.value = '12345678';
    instance.newPinInput.value = '5555';
    instance.confirmPinInput.value = '6666';
    instance.onInput();
    expect(instance.state.unmatchPin).toBe(true);

    // pin match
    instance.confirmPinInput.value = '5555';
    instance.onInput();
    expect(instance.state.unmatchPin).toBe(false);
    
    instance.focus();
    // arrow up/ arrow down
    instance.confirmPinInput.parentNode.scrollIntoView = jest.fn();
    instance.pukInput.parentNode.scrollIntoView = jest.fn();
    wrapper.find('.sim-dialog').simulate('keydown', { key: 'ArrowUp'});
    expect(instance.confirmPinInput.parentNode.scrollIntoView)
      .toBeCalledTimes(1);

    jest.clearAllMocks();
    wrapper.find('.sim-dialog').simulate('keydown', { key: 'ArrowUp'});
    expect(document.activeElement === instance.newPinInput).toBe(true);

    wrapper.find('.sim-dialog').simulate('keydown', { key: 'ArrowUp'});
    expect(document.activeElement === instance.pukInput).toBe(true);
    expect(instance.pukInput.parentNode.scrollIntoView)
      .toBeCalledTimes(1);

    jest.clearAllMocks();
    wrapper.find('.sim-dialog').simulate('keydown', { key: 'ArrowDown'});
    expect(document.activeElement === instance.newPinInput).toBe(true);

    jest.clearAllMocks();
    wrapper.find('.sim-dialog').simulate('keydown', { key: 'ArrowDown'});
    expect(instance.confirmPinInput.parentNode.scrollIntoView)
      .toBeCalledTimes(1);

    jest.clearAllMocks();
    wrapper.find('.sim-dialog').simulate('keydown', { key: 'ArrowDown'});
    expect(document.activeElement === instance.pukInput).toBe(true);
    expect(instance.pukInput.parentNode.scrollIntoView)
      .toBeCalledTimes(1);

    // test unlock
    jest.clearAllMocks();
    jest.spyOn(dialogInfo.state.slots[0], 'unlockCardLock')
      .mockReturnValueOnce(Promise.resolve('error'))
      .mockReturnValueOnce(Promise.resolve());
    jest.spyOn(instance, 'clear')
    await wrapper.find('.sim-dialog').simulate('keydown', { key: 'SoftRight'});
    expect(dialogInfo.state.slots[0].unlockCardLock).toBeCalledTimes(1);
    expect(instance.clear).toBeCalledTimes(1);
    expect(instance.state.errorName).toEqual('error');

    instance.pukInput.value = '12345678';
    instance.newPinInput.value = '5555';
    instance.confirmPinInput.value = '5555';
    instance.onInput();
    wrapper.find('.sim-dialog').simulate('keydown', { key: 'SoftRight'});
    await wrapper.find('.sim-dialog').simulate('keydown', { key: 'SoftRight'});
    expect(dialogInfo.state.slots[0].unlockCardLock).toBeCalledTimes(2);
    expect(instance.unlockSimLock).toBe(false);
  });

  test('<SimDialog /> sleep menu popup test', () => {
    jest.useFakeTimers();
    wrapper.find('.sim-dialog').simulate('keydown', { key: 'EndCall'});
    jest.advanceTimersByTime(instance.LONG_HOLD_INTERVAL);
    expect(Service.request.mock.calls[0]).toEqual(['showSleepMenu']);
  });

  test('<SimDialog /> nck input dialog test', async () => {
    dialogInfo.state.slots[0].getCardState = jest.fn(() => 'networkLocked');
    wrapper.setProps({ slot: dialogInfo.state.slots[0] });
    expect(SoftKeyStore.register.mock.calls[0][0])
      .toEqual({ 'left': 'emergency-call', 'center': 'skip'});

    instance.xckInput.value = '55555555';
    jest.clearAllMocks();
    instance.onInput();
    expect(SoftKeyStore.register.mock.calls[0][0])
      .toEqual({ 'left': 'emergency-call', 'center': 'skip', 'right': 'verify-rsk' });

    // test unlock
    jest.clearAllMocks();
    jest.spyOn(dialogInfo.state.slots[0], 'unlockCardLock')
      .mockReturnValueOnce(Promise.resolve('error'))
      .mockReturnValueOnce(Promise.resolve());
    jest.spyOn(instance, 'clear')
    await wrapper.find('.sim-dialog').simulate('keydown', { key: 'SoftRight'});
    expect(dialogInfo.state.slots[0].unlockCardLock).toBeCalledTimes(1);
    expect(instance.clear).toBeCalledTimes(1);
    expect(instance.state.errorName).toEqual('error');

    instance.xckInput.value = '66666666';
    instance.onInput();
    wrapper.find('.sim-dialog').simulate('keydown', { key: 'SoftRight'});
    await wrapper.find('.sim-dialog').simulate('keydown', { key: 'SoftRight'});
    expect(dialogInfo.state.slots[0].unlockCardLock).toBeCalledTimes(2);
    expect(instance.unlockSimLock).toBe(false);

    jest.clearAllMocks();
    await wrapper.find('.sim-dialog').simulate('keydown', { key: 'Enter'});
    expect(Service.request.mock.calls[0][0]).toEqual('setNckSkipped');
  });

  test('<SimDialog /> nck attention dialog test', async () => {
    dialogInfo.state.slots[0].getCardState = jest.fn(() => 'pinRequired');
    wrapper.setProps({ slot: dialogInfo.state.slots[0] });

    jest.clearAllMocks();
    dialogInfo.state.slots[0].getCardState = jest.fn(() => 'networkLocked');
    dialogInfo.state.showAttentionInNck = true;
    wrapper.setProps({
      slot: dialogInfo.state.slots[0],
      showAttentionInNck: dialogInfo.state.showAttentionInNck
    });
    expect(SoftKeyStore.register.mock.calls[0][0])
      .toEqual({ 'left': 'emergency-call', 'center': 'skip'});
    expect(instance.state.showAttention).toBe(true);
    jest.clearAllMocks();
    await wrapper.find('.sim-dialog').simulate('keydown', { key: 'Enter'});
    expect(Service.request.mock.calls[0][0]).toEqual('setNckSkipped');
  });

  test('<SimDialog /> block dialog test', () => {
    dialogInfo.state.slots[0].getCardState = jest.fn(() => 'permanentBlocked');
    wrapper.setProps({ slot: dialogInfo.state.slots[0] });
    expect(instance.state.showAttention).toBe(true);
  });
});
