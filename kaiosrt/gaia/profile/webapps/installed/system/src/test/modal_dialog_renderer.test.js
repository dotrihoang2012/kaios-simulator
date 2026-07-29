import '../../test/mocks/service';
import ReactDialog from 'react-dialog';
import ModalDialogRenderer from '../modal_dialog_renderer';

jest.mock('react-dialog');

describe('modal_dialog_renderer.js test', () => {
  afterEach(done => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });

  test('start function test', done => {
    expect(Service.register).toBeCalledTimes(1);
    expect(Service.register.mock.calls[0][0]).toEqual('showModalDialog');
    done();
  });

  test('showModalDialog function test with module.element is undefined', done => {
    ModalDialogRenderer.showModalDialog({}, {});
    expect(ModalDialogRenderer._modalDialog).toBeUndefined();
    done();
  });

  test('showModalDialog function test and emit opened callback', done => {
    // emit opened callback
    jest.useFakeTimers();
    jest.spyOn(ReactDialog.prototype, 'on')
      .mockImplementationOnce((key, callback) => {
        callback();
      });

    const module = {
      element: document.body
    };

    ModalDialogRenderer.showModalDialog({}, module);
    expect(module._modalDialog.show).toHaveBeenCalledTimes(1);
    expect(module._modalDialog.on).toHaveBeenCalledTimes(2);
    expect(module._modalDialog.on.mock.calls[0][0]).toEqual('opened');
    expect(module._modalDialog.on.mock.calls[1][0]).toEqual('closed');

    jest.runAllTimers();
    expect(module._modalDialog.focus).toHaveBeenCalledTimes(1);
    expect(Service.request).toBeCalledTimes(1);
    expect(Service.request.mock.calls[0][0]).toEqual('focus');
    done();
  });

  test('showModalDialog function test and emit closed callback', done => {
    jest.spyOn(ReactDialog.prototype, 'on')
      .mockImplementationOnce()
      .mockImplementationOnce((key, callback) => {
        callback();
      });

    const ele = document.createElement('div');
    ele.classList.add('dialog-container');
    ele.tabIndex = -1;
    document.body.appendChild(ele);
    const module = {
      element: document.body
    };

    ModalDialogRenderer.showModalDialog({}, module);
    expect(module._modalDialog.on).toHaveBeenCalledTimes(2);
    expect(module._modalDialog.on.mock.calls[0][0]).toEqual('opened');
    expect(module._modalDialog.on.mock.calls[1][0]).toEqual('closed');
    expect(Service.request).toBeCalledTimes(1);
    expect(Service.request.mock.calls[0][0]).toEqual('focus');
    expect(document.activeElement).toEqual(ele);
    done();
  });
});
