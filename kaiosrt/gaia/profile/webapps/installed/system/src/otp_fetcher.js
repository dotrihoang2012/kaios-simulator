import BaseModule from 'base-module';

class OtpFetcher extends BaseModule {
  
  name = 'OtpFetcher';

  DEBUG = false;

  REQUIRED_PATTERN = 'KaiOS Secret Code is';

  OTP_PATTERN = /(\b)([0-9]){4,8}(\b)/g;

  start() {
    window.addEventListener('notification', this);
  }

  handleEvent(evt) {
    var detail = evt.detail;
    switch (detail.type) {
      case 'desktop-notification':
        // 'messageId:' mean the message is fired from message app
        // 'webapp#notag' grep notification from webIDE
        this.debug('--> handleEvent(): detail = ' + detail);
        if (detail.id && detail.id.includes('messageId:') &&
            (detail.text !== '')) {
          this.showSms(detail.text);
          this.fetchOTP(detail.text);
        }
        break;
    }
  }

  // Expect back-end send message with specific pattern.
  fetchOTP(message) {
    var index = message.indexOf(this.REQUIRED_PATTERN);
    if (index < 0) {
      return;
    }
    var otp = message.match(this.OTP_PATTERN).pop();
    this.debug('--> fetchOTP(): otp = ' + otp);
    window.dispatchEvent(new CustomEvent('otpReceived', {
      detail: otp
    }));
  }

  showSms(message) {
    window.dispatchEvent(new CustomEvent('otpSmsReceived', {
      detail: message
    }))
  }
}

var instance = new OtpFetcher();
instance.start();

export default instance;
