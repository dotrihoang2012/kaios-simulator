import '../otp_fetcher';

describe('otp_fetcher.js test', () => {
  const otpSmsReceivedCB = jest.fn();
  const otpReceivedCB = jest.fn();

  test('start function test', done => {
    window.addEventListener('otpSmsReceived', otpSmsReceivedCB);
    window.addEventListener('otpReceived', otpReceivedCB);
    const evt = {
      detail: {
        type: 'desktop-notification',
        id: 'messageId:',
        text: 'KaiOS Secret Code is:11111'
      }
    };
    window.dispatchEvent(new CustomEvent('notification', evt));
    expect(otpSmsReceivedCB).toHaveBeenCalledTimes(1);
    expect(otpSmsReceivedCB.mock.calls[0][0].detail).toEqual('KaiOS Secret Code is:11111');
    expect(otpReceivedCB).toHaveBeenCalledTimes(1);
    expect(otpReceivedCB.mock.calls[0][0].detail).toEqual('11111');
    done();
  });

  afterAll(done => {
    window.removeEventListener('otpSmsReceived', otpSmsReceivedCB);
    window.removeEventListener('otpReceived', otpReceivedCB);
    done();
  });
});
