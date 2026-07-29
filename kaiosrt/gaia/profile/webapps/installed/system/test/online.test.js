describe('<online.js> test', () => {
  beforeEach((done) => {
    require('./mocks/navigator/mock_connection');
    require('../js/online');
    done();
  });

  test('window.isOnline test', (done) => {
    //1, navigator.connection.type default value is wifi
    const isOnlineValue1 = window.isOnline();
    expect(isOnlineValue1).toBeTruthy();

    //2, navigator.connection.type !== 'cellular' / 'wifi'
    navigator.connection.type = 'No network connection';
    const isOnlineValue2 = window.isOnline();
    expect(isOnlineValue2).toBeFalsy();
    done();
  });
});