import React from "react";
import Enzyme from 'enzyme';
import { mount } from "enzyme";
import toJson from 'enzyme-to-json';
import Adapter from 'enzyme-adapter-react-15.4';
import SystemOptionMenu from "../system_option_menu";
import '../../test/mocks/service';
import OptionMenu from 'react-option-menu';

Enzyme.configure({ adapter: new Adapter() });

jest.mock('react-option-menu');

describe('<SystemOptionMenu /> test', () => {
  let wrapper = null;
  let spy = null;
  beforeAll(done => {
    spy = jest.spyOn(window, 'addEventListener');
    wrapper = mount(<SystemOptionMenu />);
    done();
  });

  test('componentDidMount assertions', done => {
    expect(window.sop).not.toBeNull();
    expect(Service.register).toHaveBeenCalledTimes(2);
    expect(Service.register.mock.calls[0][0]).toEqual('showSystemOptionMenu');
    expect(Service.register.mock.calls[1][0]).toEqual('hideSystemOptionMenu');
    expect(Service.request).toHaveBeenCalledTimes(1);
    expect(Service.request.mock.calls[0][0]).toEqual('registerHierarchy');
    expect(spy).toHaveBeenCalledTimes(3);
    expect(spy.mock.calls[1][0]).toEqual('screenchange');
    expect(spy.mock.calls[2][0]).toEqual('hierarchytopmostwindowchanged');
    done();
  });

  test('showSystemOptionMenu function test', done => {
    wrapper.instance().showSystemOptionMenu();
    expect(wrapper.state().show).toBeTruthy();
    expect(wrapper.ref('systemOptionMenu').on).toHaveBeenCalledTimes(3);
    expect(wrapper.ref('systemOptionMenu').on.mock.calls[0][0]).toEqual('opened');
    expect(wrapper.ref('systemOptionMenu').on.mock.calls[1][0]).toEqual('closed');
    expect(wrapper.ref('systemOptionMenu').on.mock.calls[2][0]).toEqual('blur');
    expect(wrapper.ref('systemOptionMenu').show).toHaveBeenCalledTimes(1);
    expect(wrapper.ref('systemOptionMenu')).not.toBeUndefined();
    done();
  });

  test('hideSystemOptionMenu function test', done => {
    wrapper.instance().hideSystemOptionMenu();
    expect(wrapper.state().show).toBeFalsy();
    expect(wrapper.ref('systemOptionMenu')).toBeUndefined();
    done();
  });

  test('isActive function test', done => {
    wrapper.instance().showSystemOptionMenu();
    const isActive = wrapper.instance().isActive();
    expect(wrapper.ref('systemOptionMenu').isActive).toHaveBeenCalledTimes(1);
    expect(isActive).toBeFalsy();
    done();
  });

  test('setHierarchy function test', done => {
    wrapper.instance().showSystemOptionMenu();
    expect(wrapper.ref('systemOptionMenu')).not.toBeUndefined();
    wrapper.instance().setHierarchy();
    expect(wrapper.state().show).toBeFalsy();
    expect(wrapper.ref('systemOptionMenu')).toBeUndefined();
    done();
  });

  test('_handle_screenchange function test', done => {
    wrapper.instance().showSystemOptionMenu();
    expect(wrapper.ref('systemOptionMenu')).not.toBeUndefined();
    window.dispatchEvent(new CustomEvent('screenchange', {
      detail: {
        screenEnabled: false
      }
    }));
    expect(wrapper.state().show).toBeFalsy();
    expect(wrapper.ref('systemOptionMenu')).toBeUndefined();
    done();
  });

  test('hierarchytopmostwindowchanged event listener function test', done => {
    wrapper.instance().showSystemOptionMenu();
    expect(wrapper.ref('systemOptionMenu')).not.toBeUndefined();
    window.dispatchEvent(new CustomEvent('hierarchytopmostwindowchanged'));
    expect(wrapper.state().show).toBeFalsy();
    expect(wrapper.ref('systemOptionMenu')).toBeUndefined();
    done();
  });

  test('publishActived/publishDeactivated function test', done => {
    wrapper.instance().showSystemOptionMenu();
    expect(wrapper.ref('systemOptionMenu')).not.toBeUndefined();
    wrapper.instance().publishActived();
    wrapper.instance().publishDeactivated();
    expect(wrapper.ref('systemOptionMenu').off).toHaveBeenCalledTimes(3);
    expect(wrapper.ref('systemOptionMenu').off.mock.calls[0][0]).toEqual('opened');
    expect(wrapper.ref('systemOptionMenu').off.mock.calls[1][0]).toEqual('closed');
    expect(wrapper.ref('systemOptionMenu').off.mock.calls[2][0]).toEqual('blur');
    done();
  });

  afterEach(done => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });
});
