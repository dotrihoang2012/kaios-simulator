describe('<antitheft_manager.js> test', () => {
  beforeAll((done) => {
    require('./mocks/asyncStorage.js');
    window.FxAccountsClient = {
      refreshToken: jest.fn(() => Promise.resolve())
    };
    window.AccountManagerDBHelper = {
      get : jest.fn()
    };
    window.DUMP = jest.fn();
    window.isOnline = () => true;
    if (!navigator.b2g) {
      navigator.b2g = {};
    }
    const alarm = [{id: 1, data: {kaiAccountTokenRefresh: true}}];
    navigator.b2g.alarmManager = {
      add: jest.fn(),
      getAll: () => {return Promise.resolve(alarm)},
      remove: jest.fn()
    };
    require('../js/alarm_message_handler');
    require('../js/antitheft_manager');

    done();
  });

  test('AntitheftAlarmManager function test', (done) => {
    jest.spyOn(Date, 'now').mockImplementation(() => 160864988);
    
    AntitheftAlarmManager.loggedIn = true;
    AntitheftAlarmManager.handleAlarm({
      data: {
        kaiAccountTokenRefresh: true
      }
    });

    expect(FxAccountsClient.refreshToken).toHaveBeenCalledTimes(1);
    expect(AntitheftAlarmManager.lastRefreshTime).toBe(160864988);

    done();
  });

  test('kaiAccountTokenRefresh no need refresh', (done) => {
    expect(AntitheftAlarmManager.lastRefreshTime).toBe(160864988);
    jest.spyOn(Date, 'now').mockImplementation(() => 160865000);

    AntitheftAlarmManager.loggedIn = true;
    AntitheftAlarmManager.tryKaiAccountTokenRefresh();

    expect(FxAccountsClient.refreshToken).toHaveBeenCalledTimes(0);
    expect(AntitheftAlarmManager.lastRefreshTime).toBe(160864988);
    done();
  });

  test('kaiAccountTokenRefresh no need refresh offline', (done) => {
    // off line
    window.isOnline = () => false;

    expect(AntitheftAlarmManager.lastRefreshTime).toBe(160864988);
    const two_days = 60 * 24 * 60 * 1000 * 2;
    jest.spyOn(Date, 'now').mockImplementation(() => 160865000 + two_days);

    AntitheftAlarmManager.loggedIn = true;
    AntitheftAlarmManager.tryKaiAccountTokenRefresh();

    expect(FxAccountsClient.refreshToken).toHaveBeenCalledTimes(0);
    expect(AntitheftAlarmManager.lastRefreshTime).toBe(160864988);

    window.isOnline = () => true;
    done();
  });

  test('kaiAccountTokenRefresh need refresh back online', async (done) => {
    expect(AntitheftAlarmManager.lastRefreshTime).toBe(160864988);
    const two_days = 60 * 24 * 60 * 1000 * 2;

    jest.spyOn(Date, 'now').mockImplementation(() => 160865000 + two_days);
    window.FxAccountsClient = {
      refreshToken: jest.fn(() => Promise.resolve())
    };

    AntitheftAlarmManager.loggedIn = true;
    await AntitheftAlarmManager.tryKaiAccountTokenRefresh();

    expect(FxAccountsClient.refreshToken).toHaveBeenCalledTimes(1);
    expect(AntitheftAlarmManager.lastRefreshTime).toBe(160865000 + two_days);
    done();

  });

  test('removeAlarms function test', async (done) => {
    AntitheftAlarmManager.loggedIn = false;
    await AntitheftAlarmManager.removeAlarms();
    
    expect(global.navigator.b2g.alarmManager.remove).toHaveBeenCalledTimes(1);
    expect(AntitheftAlarmManager.lastRefreshTime).toBe(0);
    done();
    
  });

  afterEach((done) => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });
});
