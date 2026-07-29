/* eslint-disable no-undef */
import ChromeEventManager from "../chrome_event_manager";

describe('ChromeEventManager test', () => {
  test('handleEvent function test', done => {
    const evt = {
      detail: {
        type: 'Event'
      }
    };
    const spy = jest.spyOn(window, 'dispatchEvent');
    ChromeEventManager.handleEvent(evt);
    expect(spy).toHaveBeenCalledTimes(1);
    done();
  });
});
