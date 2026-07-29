describe('<http_status.js> test', () => {
  beforeAll((done) => {
    require('../../js/dongle/http_server');
    require('../../js/dongle/http_status');
    done();
  });

  test('HTTPStatus test', (done) => {
    expect(typeof HTTPStatus).toBe('object');

    const {
      STATUS_CODES,
      getStatusLine
    } = HTTPStatus;

    expect(typeof STATUS_CODES).toBe('object');
    expect(typeof getStatusLine).toBe('function');
    done();
  });

  test('getStatusLine function test', (done) => {
    const {
      getStatusLine
    } = HTTPStatus;

    const value = getStatusLine(302);

    expect(value).toMatch(/HTTP\/1.1 302 Moved Temporarily/);
    done();
  });
});