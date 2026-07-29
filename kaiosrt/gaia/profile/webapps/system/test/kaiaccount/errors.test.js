describe('<errors.js> test', () => {
  beforeAll((done) => {
    require('../../js/kaiaccount/errors');
    done();
  });

  test('KaiAccountErrorTable test', (done) => {
    expect(typeof KaiAccountErrorTable).toBe('object');
    done();
  });
});