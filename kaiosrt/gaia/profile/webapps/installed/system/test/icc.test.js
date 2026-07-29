require('./mocks/navigator/iccManager');
require('./mocks/SettingsObserver');
require('./mocks/lazy_loader');
require('./mocks/service');
require('./mocks/navigator/mobileConnections');

let event = new CustomEvent('serviceworkermessage', {
  detail: {
    type: 'icc-stkcommand',
    data: {
      iccId: 1,
      command: {
        typeOfCommand: '36',
        options: {
          icon: '',
          title: 'test'
        }
      }
    }
  }
});
class WebActivity {
  start() {
    return new Promise (resolve => {
      resolve();
    })
  }
}
global.WebActivity = WebActivity;
describe('icc', () => {
  beforeAll(() => {
    window.DUMP = jest.fn();
    window.FtuLauncher = {
      isFtuRunning: () => {
        return true;
      }
    };
    window.icc_worker = {
      '36': jest.fn(),
      idleTextNotifications: []
    };
    window.STKHelper = {
      getMessageText: jest.fn()
    };
    jest.spyOn(Service, 'request')
      .mockImplementation((arg1, arg2, cb) => {
        cb();
      });
    require('../js/icc');
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('serviceworkermessage', () => {
    jest.spyOn(FtuLauncher, 'isFtuRunning');
    window.dispatchEvent(event);
    expect(FtuLauncher.isFtuRunning).toHaveBeenCalled();
  });
  test('ftudone', () => {
    FtuLauncher.isFtuRunning.mockReturnValue(false);
    window.dispatchEvent(new CustomEvent('ftudone'));
    expect(icc_worker['36']).toHaveBeenCalled();
  });
  test('iac-settingsstk', () => {
    const evt = new CustomEvent('iac-settingsstk', {
      detail: 'StkMenuHidden'
    });
    Service.request = jest.fn();
    window.dispatchEvent(evt);
    expect(Service.request).toHaveBeenCalled();
  });
  test('iac-settingsstk, not StkMenuHidden', () => {
    const evt = new CustomEvent('iac-settingsstk', {
      detail: 'test'
    });
    window.dispatchEvent(evt);
    expect(Service.request).not.toHaveBeenCalled();
  });
  test('showIdleModeTextNotification, idle mode text is null', () => {
    window.NotificationHelper = {
      send: () => {
        return new Promise(resolve => {
          resolve();
        });
      }
    };
    jest.spyOn(NotificationHelper, 'send');
    icc.showIdleModeTextNotification();
    expect(NotificationHelper.send).not.toHaveBeenCalled();
  });
  test('showIdleModeTextNotification', () => {
    navigator.b2g.mobileConnections[0].iccId = 1;
    icc.setIdleModeTextMsg({
      command: {
        options: {
          text: 'test'
        }
      }
    });
    let notification = {
      onclick: null
    };
    window.NotificationHelper = {
      send: () => {
        return new Promise(resolve => {
          resolve(notification);
        });
      }
    };
    jest.spyOn(NotificationHelper, 'send');
    icc.showIdleModeTextNotification().then(() => {
      notification.onclick();
      expect(NotificationHelper.send).toHaveBeenCalled();
    });
  });
  test('discardCurrentMessageIfNeeded', () => {
    jest.spyOn(icc, 'responseSTKCommand');
    icc.discardCurrentMessageIfNeeded('test');
    expect(icc.responseSTKCommand).toHaveBeenCalled();
  });
  test('input', () => {
    icc.input();
    expect(Service.request).toHaveBeenCalled();
  });
  test('showURL, icon not null', () => {
    icc._defaultURL = 'test';
    jest.spyOn(Service, 'request')
      .mockImplementation((name, options) => {
        if (options && options.callback) {
          options.callback('done');
        }
      });
    jest.spyOn(icc, 'asyncConfirm');
    icc.showURL('test', null, 'test');
    expect(icc.asyncConfirm).toHaveBeenCalled();
  });
  test('showURL, icon null', () => {
    jest.spyOn(icc, 'asyncConfirm');
    icc.showURL('test', null);
    expect(icc.asyncConfirm).not.toHaveBeenCalled();
  });
  test('confirm', () => {
    icc.confirm();
    expect(Service.request).toHaveBeenCalled();
  });
  test('calculateDurationInMS', () => {
    navigator.b2g.iccManager.STK_TIME_UNIT_MINUTE = 0;
    navigator.b2g.iccManager.STK_TIME_UNIT_SECOND = 1;
    navigator.b2g.iccManager.STK_TIME_UNIT_TENTH_SECOND = 2;
    let timeout = icc.calculateDurationInMS(0, 2);
    expect(timeout).toBe(120000);
    timeout = icc.calculateDurationInMS(1, 2);
    expect(timeout).toBe(2000);
    timeout = icc.calculateDurationInMS(2, 2);
    expect(timeout).toBe(200);
  });
  test('backResponse', () => {
    icc.backResponse(event.detail.data);
    expect(icc.responseSTKCommand).toHaveBeenCalled();
  });
  test('helpResponse', () => {
    icc.helpResponse(event.detail.data);
    expect(icc.responseSTKCommand).toHaveBeenCalled();
  });
  test('terminateResponse', () => {
    icc.terminateResponse(event.detail.data);
    expect(icc.responseSTKCommand).toHaveBeenCalled();
  });
  test('handleSTKCommand, message is null', () => {
    jest.spyOn(FtuLauncher, 'isFtuRunning');
    icc.handleSTKCommand();
    expect(FtuLauncher.isFtuRunning).not.toHaveBeenCalled();
  });
  test('handleSTKCommand, message type is not string', () => {
    event.detail.data.command.typeOfCommand = 36;
    icc_worker['0x24'] = null;
    jest.spyOn(icc, 'resize');
    icc.handleSTKCommand(event.detail.data);
    expect(icc.resize).not.toHaveBeenCalled();
  });
  test('getConnection, mobile connection is not null', () => {
    let con = icc.getConnection(1);
    expect(con.iccId).toBe(1);
  });
  test('getSIMNumber, mobile connection is null', () => {
    navigator.b2g.mobileConnections = null;
    let sim = icc.getSIMNumber();
    expect(sim).toBe('');
  });
  test('getConnection, mobile connection is null', () => {
    let con = icc.getConnection(1);
    expect(con).toBeNull();
  });
  test('getIccInfo', () => {
    LazyLoader.getJSON = () => {
      return new Promise((resolve, reject) => {
        if (!rslv) {
          reject();
        } else {
          resolve()
        }
      })
    };
    icc.getIccInfo();
  });
  test('checkPlatformCompatibility', () => {
    icc._iccManager.STK_RESULT_ACTION_CONTRADICTION_TIMER_STATE = 0x21;
    icc.checkPlatformCompatibility();
    expect(icc._iccManager.STK_RESULT_ACTION_CONTRADICTION_TIMER_STATE)
      .not.toBe(0x24);
  });
  test('init, navigator.b2g.iccManager is null', () => {
    navigator.b2g.iccManager = null;
    jest.spyOn(icc, 'checkPlatformCompatibility');
    icc.init();
    expect(icc.checkPlatformCompatibility).not.toHaveBeenCalled();
  });
});
