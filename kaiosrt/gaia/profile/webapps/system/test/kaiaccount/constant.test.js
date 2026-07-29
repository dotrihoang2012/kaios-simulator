describe('<constant.js> test', () => {
  beforeAll((done) => {
    require('../../js/kaiaccount/constant');
    done();
  });

  test('KaiAccountConfig test', (done) => {
    expect(typeof KaiAccountConfig).toBe('object');

    const {
      LOGIN_TYPE_KEY,
      LOGIN_TYPE,
      API_PREFIX,
      SERVICE_ID,
      PARTNER_ID
    } = KaiAccountConfig;

    expect(typeof LOGIN_TYPE_KEY).toBe('string');
    expect(typeof LOGIN_TYPE).toBe('object');
    expect(typeof API_PREFIX).toBe('object');
    expect(typeof SERVICE_ID).toBe('string');
    expect(typeof PARTNER_ID).toBe('string');
    done();
  });
});