/* eslint-disable no-undef */
import React from 'react';
import Enzyme from 'enzyme';
import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import Adapter from 'enzyme-adapter-react-15.4';
import AutoUpdateView from '../auto_update_view';
import '../../test/mocks/service';

Enzyme.configure({ adapter: new Adapter() });

describe('<AutoUpdateView /> component test', () => {
  let wrapper = null;

  beforeAll(done => {
    wrapper = mount(<AutoUpdateView />);
    done();
  });

  test('AutoUpdateView initial dom render test', done => {
    expect(Object.prototype.toString.call(wrapper.instance().element)).toBe(
      '[object HTMLDivElement]'
    );
    expect(toJson(wrapper)).toMatchSnapshot();
    expect(Service.register).toHaveBeenCalledTimes(2);
    expect(Service.register.mock.calls[0][0]).toEqual('show');
    expect(Service.register.mock.calls[1][0]).toEqual('hide');
    expect(Service.request).toHaveBeenCalledTimes(1);
    expect(Service.request.mock.calls[0][0]).toEqual('registerHierarchy');
    done();
  });

  test('show function test', done => {
    wrapper.instance().show({ updateSuccess: true, isSystemApp: true });
    expect(wrapper.state()).toEqual({
      isActive: true,
      updateSuccess: true,
      isSystemApp: true
    });
    wrapper.update();
    expect(toJson(wrapper)).toMatchSnapshot();
    done();
  });

  test('hide function test', done => {
    wrapper.instance().show({ updateSuccess: true, isSystemApp: false });
    wrapper.instance().hide();
    expect(wrapper.state()).toEqual({
      isActive: false,
      updateSuccess: false,
      isSystemApp: false
    });
    wrapper.update();
    expect(toJson(wrapper)).toMatchSnapshot();
    done();
  });

  test('isActive function test', done => {
    wrapper.instance().show();
    const isActive =  wrapper.instance().isActive();
    expect(wrapper.state().isActive).toBeTruthy();
    expect(isActive).toBeTruthy();
    done();
  });

  test('setHierarchy function test', done => {
    wrapper.instance().setHierarchy(true);
    wrapper.instance().setHierarchy(false);
    expect(document.activeElement.id).toBe('auto-update-view');
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
