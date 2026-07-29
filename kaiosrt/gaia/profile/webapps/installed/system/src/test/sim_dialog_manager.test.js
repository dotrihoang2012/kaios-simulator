/* eslint-disable no-undef */
import React from 'react';
import Enzyme from 'enzyme';
import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import Adapter from 'enzyme-adapter-react-15.4';
import SimDialogManager from '../sim_dialog_manager';
import SimLockStore from '../sim_lock_manager';
import '../../test/mocks/service';

Enzyme.configure({ adapter: new Adapter()});

jest.mock('../sim_lock_manager', () => {
  return {
    state: {
      active: true,
      slots: ['slot11'],
      nckSkipButton: false,
      showAttentionInNck: false
    },
    on: jest.fn()
  }
});

jest.mock('../sim_dialog');

describe('<SimDialogManager /> component test', () => {
  let wrapper = null;
  let instance = null;
  beforeAll(done => {
    wrapper = mount(<SimDialogManager />);
    instance = wrapper.instance();
    done();
  });

  test('<SimDialogManager /> dom render test', done => {
    expect(toJson(wrapper)).toMatchSnapshot();
    expect(wrapper.state()).toEqual({
      "active": true,
      "nckSkipButton": false,
      "showAttentionInNck": false,
      "slots": ["slot11"]
    });
    expect(SimLockStore.on).toHaveBeenCalledTimes(1);
    expect(instance.store).not.toBeUndefined();
    expect(Service.request).toHaveBeenCalledTimes(1);
    expect(Service.request.mock.calls[0][0]).toEqual('registerHierarchy');
    expect(instance.dialog).not.toBeUndefined();
    expect(instance.element).not.toBeUndefined();
    done();
  });

  test('setHierarchy function test', done => {
    instance.setHierarchy(true);
    expect(instance.dialog.focus).toHaveBeenCalledTimes(1);
    done();
  });

  test('screenchange callback function test', done => {
    const evt = {detail: {screenEnabled: false }};
    window.dispatchEvent(new CustomEvent('screenchange', evt));
    expect(instance.dialog.clearInput).toHaveBeenCalledTimes(1);
    done();
  });

  test('isActive function test', done => {
    const isActive = instance.isActive();
    expect(isActive).toBeTruthy();
    done();
  });

  test('onClose function test', done => {
    instance.onClose();
    expect(wrapper.state().isActive).toBeFalsy();
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
