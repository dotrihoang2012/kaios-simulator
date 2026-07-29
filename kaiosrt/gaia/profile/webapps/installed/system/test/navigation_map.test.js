describe('<js/navigation_map.js> test', () => {
  beforeAll((done) => {
    require('../js/navigation_map');
    done();
  });

  beforeEach((done) => {
    jest.spyOn(window, 'focus').mockImplementation(() => {});
    done();
  });

  test('init function test', (done) => {
    jest.useFakeTimers();
    document.body.innerHTML = `
    <div id="screen">
      <div id="target" class="action-menu">
        <span class="menu-item"></span>
      </div>
    </div>
   `;
    const target = document.getElementById('target');
    const span = document.querySelectorAll('.menu-item')[0];

    function MockMutationObserver(callback) {
      const mutations = [{
        type: 'attributes',
        attributeName: 'class',
        target: target
      }];
      callback(mutations);
    }
    MockMutationObserver.prototype = {
      observe: jest.fn()
    };
    global.MutationObserver = MockMutationObserver;
    const resetSpy = jest.spyOn(NavigationMap, 'reset');

    NavigationMap.init();
    jest.runAllTimers();
    expect(resetSpy).toBeCalledTimes(1);
    expect(span.classList.contains('focus')).toBe(true);
    done();
  });

  test('setFocusedIndex function test', (done) => {
    expect(NavigationMap._focus_index).toBe(0);
    NavigationMap.setFocusedIndex(3);
    expect(NavigationMap._focus_index).toBe(3);
    done();
  });

  test('getFocus & removeFocus functions test', (done) => {
    document.body.innerHTML = `
    <div>
      <div class="focus"></div>
    </div>
  `;
    const focused = document.querySelectorAll('.focus');

    // test getFocus
    const value = NavigationMap.getFocus();
    expect(typeof value).toBe('object');

    //test removeFocus
    expect(focused[0].classList.contains('focus')).toBe(true);
    NavigationMap.removeFocus();
    expect(focused[0].classList.contains('focus')).toBe(false);
    done();
  });

  test('handleClick function test', (done) => {
    document.body.innerHTML = `
    <div id="notifications-lockscreen-cmas">
     <span>1</span>
     <span>2</span>
    </div>
  `;
    const target = document.getElementById('notifications-lockscreen-cmas');
    const clickSpy = jest.spyOn(target, 'click');
    const evt = {
      target: target
    };

    NavigationMap.handleClick();
    expect(clickSpy).toBeCalledTimes(1);

    target.setAttribute('hidden', false);
    NavigationMap.handleClick(evt);
    expect(clickSpy).toBeCalledTimes(2);
    done();
  });

  test('reset & update functions test', (done) => {
    document.body.innerHTML = `
    <div class="menu-item">
      <span class="focus">test</span>
     </div>
  `;
    NavigationMap.reset();
    expect(NavigationMap._controls[0].classList.contains('focus')).toBe(true);
    expect(NavigationMap._controls[0].getAttribute('data-nav-id')).toBe('0');
    done();
  });

  test('crashset function test', (done) => {
    document.body.innerHTML = `
    <div>
     <div id="always-report">
      <span class="focus">test</span>
     </div>
     <div id="crash-info-link">
       <span class="focus">test</span>
     </div>
     </div>
    </div>
  `;
    const focused = document.querySelectorAll('.focus');
    const control1 = document.getElementById('always-report');
    NavigationMap.crashset();
    expect(focused[0].classList.contains('focus')).toBe(false);
    expect(control1.classList.contains('focus')).toBe(true);
    done();
  });

  test('inputset function test', (done) => {
    document.body.innerHTML = `
    <div id="icc-input-box">
    <input class="focus" />
    </div>
  `;
    const input = document.querySelectorAll('.focus');
    const iccBox = document.getElementById('icc-input-box');
    NavigationMap.inputset();
    expect(input[0].classList.contains('focus')).toBe(false);
    expect(iccBox.classList.contains('focus')).toBe(true);
    done();
  });

  afterEach((done) => {
    document.body.innerHTML = '';
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });
});