import '../../test/mocks/service';
import OptionMenu from 'react-option-menu';
import SoftKeyStore from 'soft-key-store';
import OptionMenuRenderer from '../option_menu_renderer';

jest.mock('react-option-menu');
jest.mock('soft-key-store');

describe('option_menu_renderer.js test', () => {
  beforeAll(done => {
    document.body.innerHTML = `<div id="menu-root"></div>`;
    done();
  });

  afterEach(done => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });

  test('start function test', done => {
    expect(Service.register).toBeCalledTimes(2);
    expect(Service.register.mock.calls[0][0]).toEqual('showOptionMenu');
    expect(Service.register.mock.calls[1][0]).toEqual('hideOptionMenu');
    done();
  });

  test('showOptionMenu function test with module.element is undefined', done => {
    jest.spyOn(OptionMenu.prototype, 'on')
      .mockImplementationOnce((key, callback) => {
        callback();
      });
    OptionMenuRenderer.showOptionMenu({}, {});
    expect(OptionMenuRenderer.optionMenu).not.toBeNull();
    expect(OptionMenuRenderer.optionMenu.show).toHaveBeenCalledTimes(1);
    expect(OptionMenuRenderer.optionMenu.on).toHaveBeenCalledTimes(1);
    // closed callback
    expect(Service.request).toBeCalledTimes(1);
    expect(Service.request.mock.calls[0][0]).toEqual('focus');
    done();
  });

  test('showOptionMenu function test with module._optionMenu is not null', done => {
    const module = {
      element: {},
      _optionMenu: { show: jest.fn() }
    };
    OptionMenuRenderer.showOptionMenu({}, module);
    expect(module._optionMenu.show).toHaveBeenCalledTimes(1);
    done();
  });

  test('showOptionMenu function test and emit opened callback', done => {
    // emit opened callback
    jest.spyOn(OptionMenu.prototype, 'on')
      .mockImplementationOnce((key, callback) => {
        callback();
      });
    const module = {
      element: document.body,
    };
    OptionMenuRenderer.showOptionMenu({}, module);
    expect(OptionMenuRenderer.optionMenu).not.toBeNull();
    expect(module._optionMenu.show).toHaveBeenCalledTimes(1);
    expect(module._optionMenu.on).toHaveBeenCalledTimes(2);
    expect(module._optionMenu.on.mock.calls[0][0]).toEqual('opened');
    // opened callback
    expect(Service.request).toBeCalledTimes(1);
    expect(Service.request.mock.calls[0][0]).toEqual('focus');
    expect(module._optionMenu.off).toHaveBeenCalledTimes(1);
    expect(module._optionMenu.off.mock.calls[0][0]).toEqual('opened');
    done();
  });

  test('showOptionMenu function test and emit closed callback', done => {
    jest.spyOn(OptionMenu.prototype, 'on')
      .mockImplementationOnce(() => {})
      .mockImplementationOnce((key, callback) => {
        callback();
      });

    const module = {
      element: document.body,
    };

    OptionMenuRenderer.showOptionMenu({}, module);
    expect(Service.request).toBeCalledTimes(1);
    expect(Service.request.mock.calls[0][0]).toEqual('focus');
    expect(OptionMenu.prototype.off).toBeCalledTimes(1);
    expect(OptionMenu.prototype.off.mock.calls[0][0]).toEqual('closed');
    expect(SoftKeyStore.unregister).toBeCalledTimes(1);
    expect(module._optionMenu).toBeNull();
    done();
  });

  test('hideOptionMenu function test', done => {
    OptionMenuRenderer.showOptionMenu({}, {});
    expect(OptionMenuRenderer.optionMenu).not.toBeNull();
    OptionMenuRenderer.hideOptionMenu();
    expect(OptionMenuRenderer.optionMenu).toBeNull();
    done();
  });

  afterAll(done => {
    document.body.innerHTML = '';
    done();
  });
});
