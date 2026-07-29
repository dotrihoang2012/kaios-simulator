import MockAppWindowManager from './mocks/mock_app_window_manager.js';

describe('<activity_window_manager.js> test', () => {
  let activityWindowManager;
  beforeEach((done) => {
    require('./mocks/service');
    require('./mocks/mock_appOrigin');
    require('./mocks/mock_attentionWindowManager');
    require('../js/activity_window_manager');
    activityWindowManager = new ActivityWindowManager();
    done();
  });

  test('ActivityWindowManager test', (done) => {
    expect(typeof ActivityWindowManager).toBe('function');
    done();
  });

  test('start function test', (done) => {
    const spy = jest.spyOn(window, 'addEventListener');
    expect(activityWindowManager._started).toBe(undefined);

    activityWindowManager.start();
    expect(activityWindowManager._started).toBe(true);
    expect(activityWindowManager.activityPool.size).toBe(0);
    expect(spy).toHaveBeenCalledTimes(8);

    // if this._started == true --> return
    activityWindowManager.start();
    expect(spy).toHaveBeenCalledTimes(8);
    done();
  });

  test('stop function test', (done) => {
    const spy = jest.spyOn(window, 'removeEventListener');
    activityWindowManager.start();
    expect(activityWindowManager._started).toBe(true);

    activityWindowManager.stop();
    expect(activityWindowManager._started).toBe(false);
    expect(activityWindowManager.activityPool).toBe(null);
    expect(spy).toHaveBeenCalledTimes(8);

    // if this._started == false --> return
    activityWindowManager.stop();
    expect(spy).toHaveBeenCalledTimes(8);
    done();
  });

  test('handleEvent function test', (done) => {
    activityWindowManager.start();
    //1, evt.type === 'popupopened'
    const evt1 = {
      type: 'popupopened',
      detail: {
        previousWindow: {
          instanceID: 1
        },
        instanceID: 2
      }
    };
    activityWindowManager.activityPool.set(1, 'test');
    activityWindowManager.handleEvent(evt1);
    expect(activityWindowManager.activityPool.has(1)).toBe(true);
    expect(activityWindowManager.activityPool.get(2)).toBe(true);

    // 2, evt.type === 'activitycreated' --> push evt.detail to _activities
    expect(activityWindowManager._activities).toEqual([]);
    const evt2 = {
      type: 'activitycreated',
      detail: {
        message: 'test push',
        instanceID: 6
      }
    };
    activityWindowManager.handleEvent(evt2);
    expect(activityWindowManager._activities.length).toBe(1);

    // 3, evt.type === 'activityterminated'
    // activity.instanceID === evt.detail.instanceID--> _activities.splice(index, 1)
    const evt3 = {
      type: 'activityterminated',
      detail: {
        instanceID: 6
      }
    };
    activityWindowManager.handleEvent(evt3);
    expect(activityWindowManager._activities.length).toBe(0);

    // 4, evt.type === 'activityrequesting'
    const getTopMostWindowSpy = jest.spyOn(Service.currentApp, 'getTopMostWindow')
      .mockReturnValueOnce({
        app: 'test',
        instanceID: 9
      });
    const getActiveWindowSpy = jest.spyOn(attentionWindowManager, 'getActiveWindow')
      .mockReturnValueOnce({
        manifestUrl: 'http://network-alerts.localhost',
        kill: jest.fn()
      });
    const getAppSpy = jest
      .spyOn(MockAppWindowManager, 'getApp')
      .mockReturnValueOnce({
        manifestUrl: 'http://network-alerts.localhost',
        kill: jest.fn()
      });
    window.appWindowManager = MockAppWindowManager;
    const evt4 = {
      type: 'activityrequesting',
      detail: {
        instanceID: 2,
        activityType: 'url'
      }
    };
    activityWindowManager.handleEvent(evt4);
    expect(getTopMostWindowSpy).toHaveBeenCalledTimes(1);
    expect(getAppSpy).toHaveBeenCalledTimes(1);
    expect(getActiveWindowSpy).toHaveBeenCalledTimes(1);
    expect(activityWindowManager.activityPool.has(9)).toBe(true);
    done();
  });

  afterEach((done) => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });
});
