require('../js/alarm_message_handler');

describe('<alarm_message_handler.js> test', () => {
  test('AlarmMessageHandler test', (done) => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();
    expect(AlarmMessageHandler.callbackMap.size).toBe(0);

    //1,add Callback
    AlarmMessageHandler.addCallback(callback1);
    AlarmMessageHandler.addCallback(callback2);

    expect(AlarmMessageHandler.callbackMap.size).toBe(2);
    expect(AlarmMessageHandler.callbackMap.has(callback1)).toBe(true);
    expect(AlarmMessageHandler.callbackMap.has(callback2)).toBe(true);

    //2,dispatch event --> trigger alarmFired function
    window.dispatchEvent(
      new CustomEvent('serviceworkermessage', {
        detail: {
          category: 'systemmessage',
          type: 'alarm',
          message: 'alarm message'
        }
      })
    );

    //3,remove Callback
    AlarmMessageHandler.removeCallback(callback1);
    AlarmMessageHandler.removeCallback(callback2);

    expect(AlarmMessageHandler.callbackMap.size).toBe(0);
    expect(AlarmMessageHandler.callbackMap.has(callback1)).toBe(false);
    expect(AlarmMessageHandler.callbackMap.has(callback2)).toBe(false);
    done();
  });
});