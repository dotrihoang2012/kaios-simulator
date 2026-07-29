import React from 'react';
import Enzyme from 'enzyme';
import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import Adapter from 'enzyme-adapter-react-15.4';
import PasscodeRemoteLock from '../../lockscreen/passcode_remote_lock';
import '../../../test/mocks/SettingsObserver';

Enzyme.configure({ adapter: new Adapter() });

jest.mock('../../util/utils', () => {
  return {
    toL10n: (val) => {return val}
  }
});

describe('<PasscodeRemoteLock /> component test', () => {
  let wrapper = null;
  const unlockCB = jest.fn();
  const softRightHandlerCB = jest.fn();
  const softLeftHandlerCB = jest.fn();

  beforeAll(done => {
    document.body.innerHTML = '<div id="screen"></div>';
    wrapper = mount(
      <PasscodeRemoteLock
        unlock={unlockCB}
        softRightHandler={softRightHandlerCB}
        softLeftHandler={softLeftHandlerCB}
      />
    );
    done();
  });

  test('PasscodeRemoteLock dom render test', done => {
    expect(toJson(wrapper)).toMatchSnapshot();
    expect(document.getElementById('screen').classList.contains('locked')).toBeTruthy();
    expect(wrapper.state()).toEqual({
      "currentPasscode": "",
      "error": "",
      "passcode": "000000",
      "remoteMessage": ""
    });
    done();
  });

  test('_handle_hierarchytopmostwindowchanged function test', done => {
    window.dispatchEvent(new CustomEvent('hierarchytopmostwindowchanged'));
    expect(wrapper.state()).toEqual({
      "currentPasscode": "",
      "error": "",
      "passcode": "000000",
      "remoteMessage": ""
    });
    done();
  });

  test('_handle_screenchange function test', done => {
    window.dispatchEvent(new CustomEvent('screenchange'));
    expect(wrapper.state()).toEqual({
      "currentPasscode": "",
      "error": "",
      "passcode": "000000",
      "remoteMessage": ""
    });
    done();
  });

  test('_observe_lockscreen.remote-lock function test', done => {
    const value = ['test_remoteMessage', '111111'];
    wrapper.instance()['_observe_lockscreen.remote-lock'](value);
    expect(wrapper.state()).toEqual({
      "currentPasscode": "",
      "error": "",
      "passcode": "111111",
      "remoteMessage": "test_remoteMessage"
    });
    done();
  });

  test('_observe_lockscreen.lock-message function test', done => {
    const value = 'test_remoteMessage';
    wrapper.instance()['_observe_lockscreen.lock-message']();
    wrapper.instance()['_observe_lockscreen.lock-message'](value);
    expect(wrapper.state().remoteMessage).toBe('test_remoteMessage');
    done();
  });

  test('_observe_lockscreen.lock-message function test', done => {
    const value = 'test_remoteMessage';
    wrapper.instance()['_observe_lockscreen.lock-message']();
    wrapper.instance()['_observe_lockscreen.lock-message'](value);
    expect(wrapper.state().remoteMessage).toBe('test_remoteMessage');
    done();
  });

  test('componentDidUpdate function test', done => {
    // reset state
    wrapper.setState({
      "currentPasscode": "",
      "error": "",
      "passcode": "000000",
      "remoteMessage": ""
    });
    // test this.state.currentPasscode === this.state.passcode
    wrapper.setState({ currentPasscode: '000000' });
    expect(unlockCB).toBeCalledTimes(1);
    done();
  });

  test('componentDidUpdate function test2', done => {
    // reset state
    wrapper.setState({
      "currentPasscode": "",
      "error": "",
      "passcode": "000000",
      "remoteMessage": ""
    });
    // test this.state.currentPasscode.length === this.state.passcode.length
    wrapper.setState({ currentPasscode: '111111' });
    expect(wrapper.state().error).toBe('incorrect');

    // test this.state.error && this.state.currentPasscode !== ''
    wrapper.setState({ currentPasscode: '22' });
    expect(wrapper.state().error).toBe('');
    done();
  });

  test('onKeyDown function test', done => {
    // reset state
    wrapper.setState({ currentPasscode: '' });
    // key: 'SoftRight'
    const evt = {
      key: 'SoftRight'
    };
    wrapper.find('#remote-passcode-view').simulate('keydown', evt);
    expect(softRightHandlerCB).toBeCalledTimes(1);

    // key: 'SoftLeft'
    const evt1 = {
      key: 'SoftLeft'
    };
    wrapper.find('#remote-passcode-view').simulate('keydown', evt1);
    expect(softLeftHandlerCB).toBeCalledTimes(1);

    // key: '1' ~ '0'
    const evt2 = {
      key: '1'
    };
    wrapper.find('#remote-passcode-view').simulate('keydown', evt2);
    expect(wrapper.state().currentPasscode).toBe('1');

    // key: 'Backspace'
    const evt3 = {
      key: 'Backspace'
    };
    wrapper.find('#remote-passcode-view').simulate('keydown', evt3);
    expect(wrapper.state().currentPasscode).toBe('');
    done();
  });

  afterEach(done => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });

  afterAll(done => {
    wrapper.unmount();
    done();
  });
});
