import React from 'react';
import Enzyme from 'enzyme';
import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import Adapter from 'enzyme-adapter-react-15.4';
import Passcode from '../../lockscreen/passcode';
import MockOrientationManager from '../../../test/mocks/mock_orientation_manager';
import '../../../test/mocks/SettingsObserver';
import '../../../test/mocks/service';

Enzyme.configure({ adapter: new Adapter() });

jest.mock('../../util/utils', () => {
  return {
    toL10n: (val) => {return val}
  }
});

describe('<Passcode /> component test', () => {
  let wrapper = null;
  const unlockCB = jest.fn();
  const softRightHandlerCB = jest.fn();
  const softLeftHandlerCB = jest.fn();
  beforeAll(done => {
    SettingsObserver.setValue([{
      name: 'lockscreen.passcode-lock.code',
      value: "0000"
    }]);

    global.OrientationManager = MockOrientationManager;
    document.body.innerHTML = '<div id="screen"></div>';
    wrapper = mount(
      <Passcode
        unlock={unlockCB}
        softRightHandler={softRightHandlerCB}
        softLeftHandler={softLeftHandlerCB}
      />
    );
    done();
  });

  test('Passcode dom render test', done => {
    expect(toJson(wrapper)).toMatchSnapshot();
    expect(wrapper.instance().element).not.toBeNull();
    expect(document.getElementById('screen').classList.contains('locked')).toBeTruthy();
    done();
  });

  test('_handle_hierarchytopmostwindowchanged function test', done => {
    window.dispatchEvent(new CustomEvent('hierarchytopmostwindowchanged'));
    expect(wrapper.state().validing).toBeFalsy();
    expect(wrapper.state().currentPasscode).toBe('');
    expect(wrapper.state().error).toBe('');
    done();
  });

  test('_handle_screenchange function test', done => {
    window.dispatchEvent(new CustomEvent('screenchange'));
    expect(wrapper.state().validing).toBeFalsy();
    expect(wrapper.state().currentPasscode).toBe('');
    expect(wrapper.state().error).toBe('');
    done();
  });

  test('_observe_lockscreen.passcode-lock.code function test', done => {
    wrapper.instance()['_observe_lockscreen.passcode-lock.code']('test_passcode');
    expect(wrapper.state().passcode).toBe('test_passcode');
    done();
  });

  test('_observe_lockscreen.wrong.code.info function test', done => {
    // value is object
    const val = {
      errorTimes: 300,
      retryTimestamp: 600
    };
    wrapper.instance()['_observe_lockscreen.wrong.code.info'](val);
    expect(wrapper.state().coldDown).toBeTruthy();
    expect(wrapper.state().errorTimes).toBe(300);
    expect(wrapper.state().retryTimestamp).toBe(600);
    expect(wrapper.state().validing).toBeTruthy();
    expect(wrapper.state().error).toBe('incorrect');
    expect(wrapper.state().currentPasscode).toBe('lockInput');

    // value is undefined
    wrapper.setState({ errorTimes: 900 });
    wrapper.instance()['_observe_lockscreen.wrong.code.info']();
    expect(wrapper.state().errorTimes).toBe(0);
    expect(wrapper.state().retryTimestamp).toBe(0);
    expect(wrapper.state().currentPasscode).toBe('');
    expect(wrapper.state().validing).toBeFalsy();
    expect(wrapper.state().error).toBe('');
    expect(wrapper.state().coldDown).toBeFalsy();
    done();
  });

  test('onKeyDown function test', done => {
    // key: 'SoftRight'
    const evt = {
      key: 'SoftRight'
    };
    wrapper.find('#passcode-view').simulate('keydown', evt);
    expect(softRightHandlerCB).toBeCalledTimes(1);

    // key: 'SoftLeft'
    const evt1 = {
      key: 'SoftLeft'
    };
    wrapper.find('#passcode-view').simulate('keydown', evt1);
    expect(softLeftHandlerCB).toBeCalledTimes(1);

    // key: '1' ~ '0'
    const evt2 = {
      key: '1'
    };
    wrapper.find('#passcode-view').simulate('keydown', evt2);
    expect(wrapper.state().currentPasscode).toBe('1');

    // key: 'Backspace'
    const evt3 = {
      key: 'Backspace'
    };
    wrapper.find('#passcode-view').simulate('keydown', evt3);
    expect(wrapper.state().currentPasscode).toBe('');
    done();
  });

  test('loadSettingsValue function test', done => {
    jest.spyOn(Service, 'query')
      .mockReturnValue({ errorTimes: 600, retryTimestamp: 900 });
    // this.props.firstLaunch is false
    wrapper.instance().loadSettingsValue();
    expect(wrapper.state().coldDown).toBeTruthy();
    expect(wrapper.state().errorTimes).toBe(600);
    expect(wrapper.state().validing).toBeTruthy();
    expect(wrapper.state().error).toBe('incorrect');
    expect(wrapper.state().currentPasscode).toBe('lockInput');
    expect(wrapper.state().retryTimestamp).toBe(900);

    // this.props.firstLaunch is true
    const resetRetryTimestampSpy = jest.spyOn(wrapper.instance(), 'resetRetryTimestamp')
      .mockImplementationOnce(() => {});
    wrapper.setProps({ firstLaunch: true });
    wrapper.instance().loadSettingsValue();
    expect(resetRetryTimestampSpy).toBeCalledTimes(1);
    done();
  });

  test('resetRetryTimestamp function test', done => {
    const observeWrongCodeSpy = jest.spyOn(wrapper.instance(), '_observe_lockscreen.wrong.code.info')
      .mockImplementationOnce(() => {});
    const setValueSpy = jest.spyOn(SettingsObserver, 'setValue');
    wrapper.instance().resetRetryTimestamp(600);
    expect(observeWrongCodeSpy).toBeCalledTimes(1);
    expect(setValueSpy).toBeCalledTimes(1);
    done();
  });

  test('getInvalidCodeString function test', done => {
    wrapper.setState({
      error: 'error',
      coldDown: false,
      errorTimes: 3
    });
    // case 3 ~ 5
    const obj = wrapper.instance().getInvalidCodeString();
    expect(obj).toEqual({ string: 'lockscreenCheckLockCode', coldDown: false });
    // case default
    wrapper.setState({ errorTimes: 600 });
    const obj1 = wrapper.instance().getInvalidCodeString();
    expect(obj1).toEqual({ string: 'lockscreenInvalidCode', coldDown: false });
    done();
  });

  test('componentDidUpdate function test', done => {
    jest.useFakeTimers();
    // reset state
    wrapper.setState({
      currentPasscode: "",
      passcode: "0000",
      validing: false
    });
    // test this.state.currentPasscode === this.state.passcode

    jest.spyOn(OrientationManager, 'isDefaultPortrait')
      .mockReturnValue(false);
    wrapper.setState({ currentPasscode: '0000' });
    jest.runAllTimers();
    expect(wrapper.state().errorTimes).toBe(0);
    expect(wrapper.state().retryTimestamp).toBe(0);
    expect(wrapper.state().validing).not.toBeTruthy();
    expect(unlockCB).toBeCalledTimes(1);

    // test this.state.currentPasscode.length >= this.state.passcode.length
    jest.spyOn(Date, 'now').mockImplementation(() => 1607935654389);
    wrapper.setState({ validing: false, currentPasscode: '1111' });
    expect(wrapper.state().errorTimes).toBe(1);
    expect(wrapper.state().retryTimestamp).toBe(1607935654389);
    expect(wrapper.state().validing).toBeTruthy();
    expect(wrapper.state().error).toBe('incorrect');
    expect(wrapper.state().coldDown).toBeFalsy();

    jest.runAllTimers();
    expect(wrapper.state().validing).toBeFalsy();
    expect(wrapper.state().currentPasscode).toBe('');
    expect(wrapper.state().error).toBe('');
    done();
  });

  test('updateColdDownInfo function test', done => {
    jest.spyOn(wrapper.instance(), 'componentDidUpdate')
      .mockImplementation(() => {});
    jest.useFakeTimers();
    // !this.state.coldDown && this.coldDownHandle
    wrapper.instance().coldDownHandle = {};
    wrapper.setState({
      coldDown: false
    });
    wrapper.instance().updateColdDownInfo();
    expect(wrapper.instance().coldDownHandle).toBeNull();

    // this.state.coldDown && !this.coldDownHandle
    window.setInterval = jest.fn((callback) => {callback()});
    wrapper.setState({
      coldDown: true
    });
    wrapper.instance().updateColdDownInfo();
    expect(wrapper.state().coldDown).toBeTruthy();
    done();
  });

  test('defaultProps test', done => {
    expect(typeof Passcode.defaultProps.softRightHandler).toBe('function');
    expect(typeof Passcode.defaultProps.softLeftHandler).toBe('function');
    expect(typeof Passcode.defaultProps.unlock).toBe('function');
    Passcode.defaultProps.softRightHandler();
    Passcode.defaultProps.softLeftHandler();
    Passcode.defaultProps.unlock();
    done();
  });

  afterEach(done => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    jest.clearAllTimers();
    done();
  });

  afterAll(done => {
    wrapper.unmount();
    document.body.innerHTML = '';
    done();
  });
});
