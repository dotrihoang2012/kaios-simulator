import '../../test/mocks/service';
import '../../test/mocks/l10n';
import '../../test/mocks/mock_appOrigin';
import PermissionManager from '../permission_manager';

import PermissionDialog from '../permission_dialog';

jest.mock('../permission_dialog');

describe('permission_manager.js test', () => {
  test('start function test', done => {
    const addEventSpy = jest.spyOn(window, 'addEventListener');
    PermissionManager.start();
    expect(addEventSpy).toHaveBeenCalledTimes(3);
    expect(addEventSpy.mock.calls[0][0]).toEqual('permission-prompt');
    expect(addEventSpy.mock.calls[1][0]).toEqual('lockscreen-appopened');
    expect(addEventSpy.mock.calls[2][0]).toEqual('fullscreenchange');
    done();
  });

  test('_handle_permission-prompt function test', async done => {
    // without AppsManager
    const evt = { detail: { origin: 'test' }};
    const logOn = jest.spyOn(console, 'log').mockImplementationOnce(() => {});
    const querySpyOn = jest.spyOn(Service, 'query')
      .mockReturnValue({ name: 'test', url: 'testURL' });
    const handleRequestsSpyOn = jest.spyOn(PermissionManager, 'handleRequests')
      .mockImplementation(() => {});
    await window.dispatchEvent(new CustomEvent('permission-prompt', evt));
    expect(querySpyOn).toHaveBeenCalledTimes(2);
    expect(logOn).toHaveBeenCalledTimes(1);

    // has AppsManager
    require('../../test/mocks/AppsManager');
    window.AppsManager.getApp = jest.fn(() => {});
    jest.spyOn(window.AppsManager, 'getApp')
      .mockResolvedValue(() => {});
    await window.dispatchEvent(new CustomEvent('permission-prompt', evt));
    expect(handleRequestsSpyOn).toHaveBeenCalledTimes(1);
    expect(PermissionManager.requests.length).toBe(1);
    expect(PermissionManager.requests[0].name).toBe('test');
    expect(PermissionManager.requests[0].isApp).toBeTruthy();
    done();
  });

  test('_handle_fullscreenchange function test', done => {
    window.dispatchEvent(new CustomEvent('fullscreenchange'));
    expect(Service.request).toHaveBeenCalledTimes(1);
    expect(Service.request.mock.calls[0][0]).toEqual('focus');
    done();
  });

  test('_handle_lockscreen-appopened function test', done => {
    document.mozFullScreen = true;
    document.mozCancelFullScreen = jest.fn();
    window.dispatchEvent(new CustomEvent('lockscreen-appopened'));
    expect(document.mozCancelFullScreen).toHaveBeenCalledTimes(1);
    done();
  });

  test('configMediaPermissions function test', done => {
    const detail = {
      permissions: {
        "video-capture": {options: ['front', 'back']}
      },
      manifestUrl: 'voicemail'
    };
    const result = {
      id: '111',
      type: 'permission-allow',
      detail: {},
      remember: true
    };
    const _listItemsSpyOn = jest.spyOn(PermissionManager, '_listItems')
      .mockImplementation(() => {});
    PermissionManager.configMediaPermissions(detail, result, true);
    expect(_listItemsSpyOn).toHaveBeenCalledTimes(1);
    expect(PermissionManager._pendingResponse).toEqual({
      "currentChoices": {},
      "detail": {
        "manifestUrl": "voicemail",
        "permissions": {"video-capture": {"options": ["front", "back"]}}
      },
      "permission": "video-capture",
      "result": {"detail": {}, "id": "111", "remember": true, "type": "permission-allow"}
    });
    const res = PermissionManager.configMediaPermissions(detail, result);
    expect(res).toEqual({
      "detail": {
        "choices": {"video-capture": "front"}
      },
      "id": "111",
      "remember": true,
      "type": "permission-allow"
    });
    done();
  });

  test('_listItems function test', done => {
    const choices = ['choice1', 'choice2'];
    const result = PermissionManager._listItems(choices);
    expect(result.length).toBe(2);
    expect(result[0].label).toBe('choice1-camera');
    expect(result[0].value).toBe(0);
    expect(typeof result[0].callback).toBe('function');
    expect(result[1].label).toBe('choice2-camera');
    expect(result[1].value).toBe(1);
    expect(typeof result[1].callback).toBe('function');
    done();
  });

  test('choose function test', done => {
    const detailCB = jest.fn();
    PermissionManager._pendingResponse = {
      "currentChoices": {},
      "detail": {
        "manifestUrl": "voicemail",
        "permissions": {"video-capture": ["front", "back"]},
        "callback": detailCB
      },
      "permission": "video-capture",
      "result": {
        "detail": {
          "choices": {"video-capture": "front"}
        },
        "id": "111",
        "remember": true,
        "type": "permission-allow"
      }
    };

    PermissionManager.choose(0);
    expect(detailCB).toHaveBeenCalledWith({
      "detail": {"choices": {"video-capture": "front"}},
      "id": "111",
      "remember": true,
      "type": "permission-allow"
    });
    done();
  });

  test('handleRequests function test', async done => {
    const show = jest.fn();
    const obj = {};
    PermissionManager.requests = [obj, obj];
    jest.spyOn(Service, 'query')
      .mockReturnValueOnce({ getTopMostWindow: () => {
          return {
            _permissionDialog: { show }
          }
        }
      })
      .mockReturnValueOnce({ getTopMostWindow: () => {
          return {
            element: document.createElement('div')
          }
        }
      });
    await PermissionManager.handleRequests();
    expect(show).toHaveBeenCalledTimes(1);
    expect(show).toHaveBeenCalledWith(obj);
    await PermissionManager.handleRequests();
    expect(PermissionDialog.prototype.show).toHaveBeenCalledTimes(1);
    expect(PermissionDialog.prototype.show).toHaveBeenCalledWith(obj);
    done();
  });

  afterEach(done => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });

  afterAll(done => {
    document.mozFullScreen = undefined;
    document.mozCancelFullScreen = undefined;
    done();
  });
});
