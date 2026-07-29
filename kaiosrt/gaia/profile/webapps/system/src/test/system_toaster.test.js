/* eslint-disable no-undef */
import React from 'react';
import Enzyme from 'enzyme';
import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import Adapter from 'enzyme-adapter-react-15.4';

import '../../test/mocks/service';
import BaseComponent from 'base-component';

import SystemToaster from '../system_toaster';

Enzyme.configure({ adapter: new Adapter()});

jest.mock('../enhance_animation', () => {
  return {
    __esModule: true,
    default: (ComposedComponent) => { return ComposedComponent; }
  }
});

jest.mock('../util/utils', () => {
  return {
    toL10n: (val) => {return val}
  }
});

describe('<SystemToaster /> component test', () => {
  let wrapper = null;
  let instance = null;
  beforeAll(done => {
    wrapper = mount(<SystemToaster />);
    instance = wrapper.instance();
    done();
  });

  test('SystemToaster dom render test', done => {
    expect(toJson(wrapper)).toMatchSnapshot();
    expect(wrapper.state()).toEqual({
      "ariaLabel": "",
      "gaiaIcon": "",
      "icon": "",
      "onceFlag": null,
      "text": "",
      "textL10n": "",
      "title": "",
      "titleL10n": ""
    });
    expect(instance.element).not.toBeUndefined();
    expect(Service.register).toBeCalledTimes(1);
    expect(Service.register.mock.calls[0][0]).toBe('show');
    done();
  });

  test('show function test', done => {
    // mock
    jest.useFakeTimers();
    jest.mock('base-component');
    BaseComponent.prototype.open = jest.fn();
    BaseComponent.prototype.close = jest.fn();
    const clearSpy = jest.spyOn(instance, 'clear');
    jest.spyOn(performance, 'now').mockReturnValue(1792.995997);

    const config = {
      title: 'title_test',
      text: 'text_test',
      titleL10n: 'titleL10n_test',
      gaiaIcon: 'gaiaIcon_test',
      textL10n: 'textL10n_test',
      icon: 'icon_test',
      ariaLabel: 'ariaLabel_test',
      onceFlag: false
    };
    instance.show(config);
    wrapper.update();
    expect(toJson(wrapper)).toMatchSnapshot();
    expect(clearSpy).toBeCalledTimes(1);
    expect(Service.request).toBeCalledTimes(1);
    expect(Service.request.mock.calls[0]).toEqual(["turnScreenOn", "toast"]);
    expect(wrapper.state()).toEqual({
      "ariaLabel": "ariaLabel_test",
      "gaiaIcon": "gaiaIcon_test",
      "icon": "icon_test",
      "onceFlag": false,
      "text": "text_test",
      "textL10n": "textL10n_test",
      "title": "title_test",
      "titleL10n": "titleL10n_test"
    });
    expect(BaseComponent.prototype.open).toBeCalledTimes(1);
    expect(instance.latestTimestamp).toBe(1792.995997);
    expect(instance.timer).not.toBeNull();

    // setTimeout callback test
    jest.runOnlyPendingTimers();
    expect(instance.timer).toBeNull();
    expect(BaseComponent.prototype.close).toBeCalledTimes(1);
    expect(instance.latestTimestamp).toBe(0);
    done();
  });

  // this.latestTimestamp && (!config.onceFlag || config.onceFlag !== this.state.onceFlag) is true
  test('show toast should push into toastQueue', done => {
    // prepare needed value
    instance.latestTimestamp = 1792;
    instance.state.onceFlag = true;
    instance.timer = {};

    // mock
    jest.useFakeTimers();
    jest.spyOn(performance, 'now').mockReturnValue(3000);
    jest.mock('base-component');
    BaseComponent.prototype.close = jest.fn();

    const config = {
      title: 'title_test22',
      text: 'text_test22',
      titleL10n: 'titleL10n_test22',
      gaiaIcon: 'gaiaIcon_test22',
      textL10n: 'textL10n_test22',
      icon: 'icon_test22',
      ariaLabel: 'ariaLabel_test22',
      onceFlag: false
    };
    instance.show(config);
    expect(instance.toastQueue.length).toBe(1);

    // setTimeout callback test
    jest.runOnlyPendingTimers();
    expect(instance.timer).toBeNull();
    expect(BaseComponent.prototype.close).toBeCalledTimes(1);
    expect(instance.latestTimestamp).toBe(0);
    done();
  });

  test('componentDidMount -> this.on callback(showNextToast) test', done => {
    jest.useFakeTimers();
    jest.mock('base-component');
    BaseComponent.prototype.on = (eventName, handler) => {handler()};
    const clearSpy = jest.spyOn(instance, 'clear');
    const showSpy = jest.spyOn(instance, 'show').mockImplementation(() => {});
    instance.toastQueue = [{}];
    instance.componentDidMount();
    expect(clearSpy).toBeCalledTimes(1);
    expect(showSpy).toBeCalledTimes(1);
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
    wrapper = null;
    instance = null;
    done();
  });
});
