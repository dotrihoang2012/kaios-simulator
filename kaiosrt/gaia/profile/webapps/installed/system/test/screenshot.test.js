import '../js/service.js';

describe('screenshot', () => {
  test('screenshot - init', (done) => {
    const spyObserver = jest.spyOn(Service, 'request');
    require('../js/screenshot');
    expect(spyObserver).toHaveBeenCalledTimes(1);
    spyObserver.mockRestore();
    done();
  });
});
