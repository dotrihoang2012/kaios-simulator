import React from 'react';
import Enzyme, { mount } from "enzyme";
import toJson from 'enzyme-to-json';
import Adapter from 'enzyme-adapter-react-15.4';
import '../../test/mocks/mock_appOrigin';
import '../../test/mocks/service';
import MockAppWindowManager from '../../test/mocks/mock_app_window_manager';
import FMNotification from "../fm_notification";

Enzyme.configure({ adapter: new Adapter() });

describe('<FMNotification /> component test', () => {
  let wrapper = null;
  const callback = jest.fn();

  beforeAll(done => {
    wrapper = mount(<FMNotification />);
    done();
  });

  afterEach(done => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });

  test('FMNotification dom render test', done => {
    expect(Object.prototype.toString.call(wrapper.instance().element)).toBe(
      '[object HTMLDivElement]'
    );
    expect(toJson(wrapper)).toMatchSnapshot();
    expect(Service.register).toBeCalledTimes(2);
    expect(Service.register.mock.calls[0][0]).toEqual('show');
    expect(Service.register.mock.calls[1][0]).toEqual('hide');
    done();
  });

  test('_handle_iac-FMRadioComms event test', done => {
    const evt = {
      detail: {
        action: 'update',
        name: 'name',
        freq: '111'
      }
    };
    window.dispatchEvent(new CustomEvent('iac-FMRadioComms', evt));
    wrapper.update();
    expect(toJson(wrapper)).toMatchSnapshot();
    done();
  });

  test('_handle_iac-FMRadioComms event test when PREVENTING_SHOWN is false', done => {
    const evt = {
      detail: {
        action: 'update',
        freq: '111'
      }
    };
    // change inner private variable
    wrapper.instance().PREVENTING_SHOWN = false;
    window.dispatchEvent(new CustomEvent('iac-FMRadioComms', evt));
    wrapper.update();
    expect(toJson(wrapper)).toMatchSnapshot();

    const showSpy = jest.spyOn(wrapper.instance(), 'show');
    const hideSpy = jest.spyOn(wrapper.instance(), 'hide');
    const evt1 = {
      detail: {
        action: 'show'
      }
    };
    window.dispatchEvent(new CustomEvent('iac-FMRadioComms', evt1));
    expect(hideSpy).toBeCalledTimes(1);
    const evt2 = {
      detail: {
        action: 'hide'
      }
    };
    window.dispatchEvent(new CustomEvent('iac-FMRadioComms', evt2));
    expect(showSpy).toBeCalledTimes(1);
    const evt3 = {
      detail: {
        action: 'default'
      }
    };
    window.dispatchEvent(new CustomEvent('iac-FMRadioComms', evt3));
    done();
  });

  test('_handle_appterminated event test', done => {
    const hideSpy = jest.spyOn(wrapper.instance(), 'hide');
    const evt = {
      detail: { manifestUrl: 'http://fm.localhost/manifest.webmanifest' }
    };
    window.dispatchEvent(new CustomEvent('appterminated', evt));
    expect(hideSpy).toBeCalledTimes(1);
    done();
  });

  test('openFMRadio event test', done => {
    window.appWindowManager = MockAppWindowManager;
    window.addEventListener('displayapp', callback);
    wrapper.instance().openFMRadio();
    expect(callback).toBeCalledTimes(1);
    expect(callback.mock.calls[0][0]).not.toBeNull();
    done();
  });

  afterAll(done => {
    window.removeEventListener('displayapp', callback);
    wrapper.unmount();
    done();
  });
});
