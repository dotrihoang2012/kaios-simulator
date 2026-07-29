import '../js/telemetry';

describe('telemetry', () => {
  test('telemetry - init with no data or url', (done) => {
    const { TelemetryRequest } = window;
    expect(() => {
      new TelemetryRequest({'key':'test'});
    }).toThrow();
    expect(() => {
      new TelemetryRequest({}, '');
    }).toThrow();
    done();
  });

  test('telemetry - send', (done) => {
    const { TelemetryRequest } = window;
    const telemetryRequest = new TelemetryRequest({'key':'test'}, 'website.com');
    const xhr = telemetryRequest.send({
      'timeout': 1000,
      onload: () => {},
      onabort: () => {},
      ontimeout: () => {}
    });
    expect(typeof xhr).toBe('object');
    done();
  });
});
