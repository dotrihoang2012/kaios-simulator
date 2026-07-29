describe('<developer_hud.js> test', () => {
  beforeAll((done) => {
    require('../mocks/SettingsObserver');
    require('../../js/devtools/developer_hud');
    done();
  });

  let developerHUD;
  beforeEach(done => {
    developerHUD = new DeveloperHUD();
    done();
  });

  test('start & stop functions test', (done) => {
    const addSpy = jest.spyOn(window, 'addEventListener');
    const removeSpy = jest.spyOn(window, 'removeEventListener');
    developerHUD.start();
    expect(addSpy).toBeCalledTimes(1);
    expect(addSpy.mock.calls[0][0]).toEqual('developer-hud-update');
    developerHUD.stop();
    expect(removeSpy).toBeCalledTimes(1);
    expect(removeSpy.mock.calls[0][0]).toEqual('developer-hud-update');
    done();
  });

  test('toggleSystemHUD function test', (done) => {
    expect(developerHUD._showSystemHUD).toBe(false);
    developerHUD.toggleSystemHUD();
    developerHUD.toggleSystemHUD(true);
    expect(developerHUD._showSystemHUD).toBe(true);
    done();
  });

  test('handleEvent function test', (done) => {
    const e = {
      target: window,
      detail: {},
      preventDefault: jest.fn()
    };
    developerHUD.handleEvent(e);
    expect(e.preventDefault).toBeCalledTimes(1);
    done();
  });

  test('colorHash function test', (done) => {
    const value = developerHUD.colorHash('green');
    expect(value).toEqual('hsl(169, 75%, 50%)');
    done();
  });

  test('formatMemory function test', (done) => {
    const value = developerHUD.formatMemory(3726);
    expect(value).toEqual('3.64 KB');
    done();
  });

  test('display function test', (done) => {
    document.body.innerHTML = `
      <div id='screen'>
      </div>
   `;

    HTMLCanvasElement.prototype.getContext = () => {
      // return whatever getContext has to return
      return {
        font: '',
        save: jest.fn(),
        translate: jest.fn(),
        restore: jest.fn(),
        measureText: () => {
          return {
            width: 200
          }
        },
        fillStyle: '',
        fillRect: jest.fn(),
        fillText: jest.fn()
      };
    };

    developerHUD.display();
    developerHUD._showSystemHUD = true;
    developerHUD.display(window, {
      metrics: [{
        name: 'warnings',
        value: '123'
      }]
    });
    const canvas = document.getElementsByTagName('canvas')[0];
    expect(canvas.classList.contains('widgets')).toBe(true);
    expect(canvas.height).toBe(30);
    done();
  });

  test('widget function test', (done) => {
    const value1 = developerHUD.widget({
      value: ''
    });
    const value2 = developerHUD.widget({
      name: 'warnings',
      value: '123'
    });
    const value3 = developerHUD.widget({
      name: 'errors',
      value: '123'
    });
    const value4 = developerHUD.widget({
      name: 'security',
      value: '123'
    });
    const value5 = developerHUD.widget({
      name: 'reflows',
      value: '123'
    });
    const value6 = developerHUD.widget({
      name: 'jank',
      value: '123'
    });
    const value7 = developerHUD.widget({
      name: 'uss',
      value: '123'
    });
    const value8 = developerHUD.widget({
      name: 'memory',
      value: '123'
    });
    const value9 = developerHUD.widget({
      name: 'pink',
      value: '233'
    });

    expect(value1).toBeNull();
    expect(value2.color).toEqual('orange');
    expect(value3.color).toEqual('red');
    expect(value4.color).toEqual('black');
    expect(value5.color).toEqual('purple');
    expect(value6.color).toEqual('cornflowerblue');
    expect(value7.color).toEqual('dimgrey');
    expect(value8.color).toEqual('lightslategrey');
    expect(value9.color).toEqual('hsl(74, 75%, 50%)');
    done();
  });


  afterEach((done) => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });

  afterAll(() => {
    document.body.innerHTML = '';
  });
});