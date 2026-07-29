import React from 'react';
import Enzyme from 'enzyme';
import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import Adapter from 'enzyme-adapter-react-15.4';
import '../../test/mocks/mock_appOrigin';
import '../../test/mocks/service';
import BaseComponent from 'base-component';
import SoftKeyStore from 'soft-key-store';
import SoftKeyManager from '../soft_key_manager';

Enzyme.configure({ adapter: new Adapter()});

describe('soft_key_manager.js test', () => {
  let wrapper = null;
  let instance = null;
  beforeAll(done => {
    jest.mock('soft-key-store', () => {
      // Require the original module to not be mocked...
      const originalModule = jest.requireActual('soft-key-store');
      return {
        __esModule: true, // Use it when dealing with esModules
        ...originalModule,
        toL10n: jest.fn(),
      };
    });
    SoftKeyStore.on = jest.fn();
    wrapper = mount(<SoftKeyManager />);
    instance = wrapper.instance();
    done();
  });

  afterEach(done => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });

  test('dom render test', done => {
    expect(Object.prototype.toString.call(instance.element)).toBe(
      '[object HTMLFormElement]'
    );
    expect(toJson(wrapper)).toMatchSnapshot();
    expect(instance.element).not.toBeNull();
    expect(instance.store.name).toBe('SoftKeyStore');
    expect(SoftKeyStore.on).toBeCalledTimes(1);
    expect(SoftKeyStore.on.mock.calls[0][0]).toEqual('change');
    expect(Service.registerState).toBeCalledTimes(2);
    expect(Service.registerState.mock.calls[0][0]).toEqual('isActive');
    expect(Service.registerState.mock.calls[1][0]).toEqual('getSoftkeys');
    expect(wrapper.state()).toEqual({ left: '', center: '', right: '', theme: '' });
    done();
  });

  test('componentDidMount change callback test', done => {
    SoftKeyStore.on.mockImplementationOnce((key, callback) => {
      callback();
    });
    jest.spyOn(BaseComponent.prototype, 'isActive').mockReturnValueOnce(true);

    instance.componentDidMount();
    expect(wrapper.state()).toEqual({
      "center": {"text": ""},
      "left": {"text": ""},
      "right": {"text": ""},
      "theme": ""}
    );
    expect(Service.request).toBeCalledTimes(1);
    expect(Service.request.mock.calls[0][0]).toEqual('currentSoftKeyUpdate');
    done();
  });

  test('shouldIgnore function test', done => {
    jest.spyOn(document.activeElement, 'tagName', 'get').mockReturnValueOnce('browser');
    jest.spyOn(document.activeElement.parentElement, 'hasAttribute').mockImplementation(() => true);
    const bool = instance.shouldIgnore();
    expect(bool).toBeTruthy();
    done();
  });

  test('_handle_focus function test', done => {
    jest.spyOn(document.activeElement, 'tagName', 'get').mockReturnValueOnce('browser');
    jest.spyOn(document.activeElement.parentElement, 'hasAttribute').mockImplementation(() => true);
    BaseComponent.prototype.debug = jest.fn();
    BaseComponent.prototype.hide = jest.fn();
    instance._handle_focus();
    expect(BaseComponent.prototype.debug).toBeCalledTimes(1);
    expect(BaseComponent.prototype.debug.mock.calls[0][0]).toEqual('should ignore');
    expect(BaseComponent.prototype.hide).toBeCalledTimes(1);
    done();
  });

  test('getSoftkeys function test', done => {
    SoftKeyStore.currentKeys = {
      left: 'left',
      right: 'right',
      center: 'center'
    };
    const softkeys = instance.getSoftkeys();
    expect(softkeys).toEqual([
      {"code": "SoftLeft", "options": {"name": "left"}},
      {"code": "SoftRight", "options": {"name": "right"}},
      {"code": "Enter", "options": {"name": "center"}}
    ]);
    done();
  });

  test('_handle_blur function test', done => {
    instance._handle_blur();
    expect(wrapper.state()).toEqual({ left: '', center: '', right: '', theme: '' });
    done();
  });

  afterAll(done => {
    wrapper.unmount();
    done();
  });
});
