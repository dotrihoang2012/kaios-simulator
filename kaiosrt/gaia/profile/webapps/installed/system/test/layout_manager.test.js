describe('<layout_manager.js> test', () => {
  let layoutManager;
  beforeEach((done) => {
    require('../js/layout_manager');
    layoutManager = new LayoutManager();
    done();
  });
  beforeAll((done) => {
    require('../js/service');
    document.body.innerHTML = `<div id="screen"></div>`;
    done();
  });

  test('LayoutManager test', (done) => {
    expect(typeof LayoutManager).toBe('function');
    done();
  });

  test('getter clientWidth test', (done) => {
    //1,_clientWidth is not set --> return documentElement.clientWidth
    const value1 = layoutManager.clientWidth;
    expect(value1).toBe(0);

    //2,set the _clientWidth --> return _clientWidth
    layoutManager._clientWidth = 200;
    const value2 = layoutManager.clientWidth;
    expect(value2).toBe(200);
    done();
  });

  test('getter height test', (done) => {
    window.innerHeight = 640;
    window.devicePixelRatio = 2;
    const value1 = layoutManager.height;
    expect(value1).toBe(640);

    window.innerHeight = 323;
    window.devicePixelRatio = 1.2;
    const value2 = layoutManager.height;
    expect(value2).toBeCloseTo(323.33333333333337);
    done();
  });

  test('getter width test', (done) => {
    window.innerWidth = 320;
    const value = layoutManager.width;
    expect(value).toBe(320);
    done();
  });

  test('match function test', (done) => {
    //1,not match current layout --> return false
    const value1 = layoutManager.match(320, 640);
    expect(value1).toBe(false);

    //2,match current layout --> return true
    window.innerWidth = 320;
    window.innerHeight = 640;
    window.devicePixelRatio = 1;
    const value2 = layoutManager.match(320, 640);
    expect(value2).toBe(true);
    done();
  });

  test('start function test', (done) => {
    layoutManager.start();
    expect(layoutManager._lastOrientation).toBeUndefined();
    done();
  });

  test('toggleFullscreenClass function test', (done) => {
    expect(layoutManager._screenElm.classList.contains('full-screen')).toBe(false);

    layoutManager.toggleFullscreenClass();
    expect(layoutManager._screenElm.classList.contains('full-screen')).toBe(true);
    done();
  });

  test('debug function test', (done) => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    //1, the default value of  DEBUG  is false
    layoutManager.debug();
    expect(spy).toBeCalledTimes(0);

    //2,DEBUG  is true
    layoutManager.DEBUG = true;
    layoutManager.debug();
    expect(spy).toBeCalledTimes(1);
    spy.mockRestore();
    done();
  });

  test('handleEvent function test', (done) => {
    const spy = jest.spyOn(layoutManager, 'publish').mockImplementation(() => {});
    //1, evt.type is 'fullscreenchange'
    layoutManager.handleEvent({
      type: 'fullscreenchange'
    });
    expect(layoutManager._screenElm.classList.contains('full-screen')).toBe(false);
    layoutManager.handleEvent({
      type: 'fullscreenchange'
    });
    expect(layoutManager._screenElm.classList.contains('full-screen')).toBe(true);

    //2, evt.type is 'resize'
    layoutManager.handleEvent({
      type: 'resize'
    });
    expect(spy).toBeCalledTimes(4);

    //3, default branch
    layoutManager.handleEvent({
      type: 'other'
    });
    expect(spy).toBeCalledTimes(5);
    spy.mockRestore();
    done();
  });

  test('publish function test', (done) => {
    const spy = jest.spyOn(layoutManager, 'debug').mockImplementation(() => {});
    layoutManager.publish();
    expect(spy).toBeCalledTimes(1);
    expect(spy.mock.calls[0][0]).toMatch(/publish:/);
    spy.mockRestore();
    done();
  });

  afterAll((done) => {
    document.body.innerHTML = '';
    done();
  });
});