describe('<telephony_mirror.js> test', () => {
  let telephonyMirror;
  beforeEach((done) => {
    require('../../test/mocks/navigator/telephony');
    telephonyMirror = require('../telephony_mirror').default;
    done();
  });

  test('start function test', (done) => {
    expect(navigator.b2g.telephony.addEventListener.mock.calls.length).toBe(2);
    expect(navigator.b2g.telephony.conferenceGroup.addEventListener.mock.calls.length).toBe(1);
    expect(navigator.b2g.telephony.addEventListener.mock.calls[0][0]).toEqual('callschanged');
    expect(navigator.b2g.telephony.addEventListener.mock.calls[1][0]).toEqual('incoming');
    done();
  });

  test('_handlePhoneState function test ', (done) => {
    //1,default : calls = []
    telephonyMirror._handlePhoneState();
    expect(telephonyMirror._phoneState).toBe(0);

    //2,calls.length > 0
    //2-1,callState is RINGING
    navigator.b2g.telephony.calls = [{ num: 18800210808, state: 'incoming' }];
    telephonyMirror._handlePhoneState();
    expect(telephonyMirror._phoneState).toBe(1);
    //2-2,callState is OFFHOOK
    navigator.b2g.telephony.calls = [{ num: 13300210000, state: 'dialing' }];
    telephonyMirror._handlePhoneState();
    expect(telephonyMirror._phoneState).toBe(2);

    //3,calls = [] & conferenceGroup.state === 'connected'/'held'
    navigator.b2g.telephony.calls = [];
    //3-1,conferenceGroup.state === 'held'
    navigator.b2g.telephony.conferenceGroup.state = 'held';
    telephonyMirror._handlePhoneState();
    expect(telephonyMirror._phoneState).toBe(2);
    //3-2,conferenceGroup.state === 'connected'
    navigator.b2g.telephony.conferenceGroup.state = 'connected';
    telephonyMirror._handlePhoneState();
    expect(telephonyMirror._phoneState).toBe(2);
    done();
  });

  test('_hasRingingCall function test', (done) => {
    //1, has ringing call --> return true
    const value1 = telephonyMirror._hasRingingCall([{ num: 13399990000, state: 'incoming' }]);
    expect(value1).toBe(true);

    //2, no ringing call --> return false
    const value2 = telephonyMirror._hasRingingCall([]);
    expect(value2).toBe(false);
    done();
  });

  test('handleEvent function test', (done) => {
    const spy = jest.spyOn(telephonyMirror, '_handlePhoneState').mockImplementation(() => { });
    //1, evt.type === 'callschanged'
    telephonyMirror.handleEvent({ type: 'callschanged' });
    expect(spy).toBeCalledTimes(1);

    //2,evt.type === 'incoming'
    const evtObj = {
      type: 'incoming',
      call: {
        num: 18800210808,
        state: 'incoming',
        addEventListener: jest.fn((state, cb) => {
          cb();
        })
      }
    };
    telephonyMirror.handleEvent(evtObj);
    expect(evtObj.call.addEventListener).toBeCalledTimes(1);
    expect(spy).toBeCalledTimes(2);

    //3,evt.type === 'statechange'
    telephonyMirror.handleEvent({ type: 'statechange' });
    expect(spy).toBeCalledTimes(3);
    spy.mockRestore();
    done();
  });
});
