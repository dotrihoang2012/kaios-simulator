require('../js/ussd_receiver');
require('./mocks/navigator/mobileConnections');
require('./mocks/service');
require('./mocks/l10n');
require('./mocks/navigator/telephony');

let event = new CustomEvent('serviceworkermessage', {
  detail: {
    type: 'ussd-received',
    data: {
      sessionEnded: null
    }
  }
});
describe('ussdReceiver', () => {
  beforeAll(() => {
    window.DUMP = jest.fn();
  });
  beforeEach(() => {
    jest.restoreAllMocks();
  });
  test('receive ussd-received message', () => {
    // mmiloading is false
    event.detail.data.sessionEnded = false;
    event.detail.data.message = 'test';
    jest.spyOn(Service, 'request')
      .mockImplementation((name, options) => {
        if (name === 'StkDialog:show') {
          if (options.onOk) {
            options.onOk();
            options.onOk('test');
          }
        }
      });
    window.dispatchEvent(event);
    expect(Service.request).toHaveBeenCalled();
  });
  test('receive ussd-received message session ended, mmiloading true', () => {
    event.detail.data.sessionEnded = true;
    navigator.b2g.mobileConnections[0].voice = {
      network: 'CMCC'
    };
    jest.spyOn(Service, 'request');
    window.dispatchEvent(event);
    expect(Service.request).toHaveBeenCalled();

    jest.clearAllMocks();
    navigator.b2g.mobileConnections[0].voice = null;
    navigator.b2g.mobileConnections[0].data = {
      network: 'CMCC'
    };
    event.detail.data.message = null;
    window.dispatchEvent(event);
    expect(Service.request).toHaveBeenCalled();
  });
  test('receive ussd-received message session ended, mmiloading true', () => {
    navigator.b2g.mobileConnections = null;
    event.detail.data.sessionEnded = true;
    jest.spyOn(Service, 'request');
    window.dispatchEvent(event);
    expect(Service.request).toHaveBeenCalled();
  });
  test('receive other message', () => {
    event = new CustomEvent('serviceworkermessage', {
      detail: null
    });
    jest.spyOn(Service, 'request');
    window.addEventListener = (name, cb) => {
      cb();
      expect(Service.request).not.toHaveBeenCalled();
    };
    window.dispatchEvent(event);
  });
});
