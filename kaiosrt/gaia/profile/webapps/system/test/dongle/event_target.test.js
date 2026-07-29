describe('<event_target.js> test', () => {
  beforeEach((done) => {
    require('../../js/dongle/event_target');
    done();
  });

  test('dispatchEvent function test', (done) => {
    const eventsObj = {
      _events: {
        'click': [jest.fn(), jest.fn()],
        'focus': [jest.fn(), jest.fn()],
        'blur': [jest.fn(), jest.fn()],
        'change': [jest.fn(), jest.fn()]
      }
    };
    const data = {
      detail: {}
    };

    //1, typeof eventsObj !== 'object'  --> return
    const eventTarget1 = new EventTarget('test');
    eventTarget1.dispatchEvent('click', data);
    expect(typeof eventTarget1._events).toBe('undefined');

    //2, typeof eventsObj === 'object'
    const eventTarget2 = new EventTarget(eventsObj);
    eventTarget2.dispatchEvent('focus', data);
    expect(typeof eventTarget2._events).toBe('object');
    expect(eventTarget2._events.focus[0]).toHaveBeenCalled();
    expect(eventTarget2._events.focus[1]).toHaveBeenCalled();
    done();
  });

  test('addEventListener & removeEventListener function test', (done) => {
    const eventsObj = {
      _events: {
        'click': [],
      }
    };
    const listener = jest.fn();

    const eventTarget = new EventTarget(eventsObj);
    expect(eventTarget._events.click.length).toBe(0);

    //addEventListener
    eventTarget.addEventListener('click', listener);
    expect(eventTarget._events.click.length).toBe(1);

    //addEventListener --> repeat --> return
    eventTarget.addEventListener('click', listener);
    expect(eventTarget._events.click.length).toBe(1);

    // removeEventListener
    eventTarget.removeEventListener('click', listener);
    expect(eventTarget._events.click.length).toBe(0);
    done();
  });
});