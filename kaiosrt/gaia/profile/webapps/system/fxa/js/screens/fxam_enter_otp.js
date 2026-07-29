/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global $, FxaModule, FxModuleServerRequest, FxaModuleStates, FxaModuleOverlay,
     FxaModuleManager, ViewManager, NavigationMap, accountUtils, showHint,
     _checkEmail, _getTimeRemaining, _showConfirmation, FxaModuleNavigation */
/* exported FxaModuleEnterOTP */

'use strict';

/**
 * This module wait the OTP of a phone number. Once it get the OTP,
 * sign in the account with the phone number, OTP.
 * Then, determines which screen to go next according to receive OTP
 * or not, server response.
 */

  /* eslint-disable-next-line no-unused-vars */
var FxaModuleEnterOTP = (function() {
  var endTime;
  var countdownTimer = null;
  var COUNTDOWN_TIME_MIN = 2;
  var COUNTDOWN_TIME = COUNTDOWN_TIME_MIN * 60 * 1000;
  var COUNTDOWN_INTERVAL_TIME = 1000;
  var loading, resendShown;
  var currentPasscode = '';
  var CODELENGTH = 4;

  var qwertyKeyMapping = {
    'w': '1',
    'e': '2',
    'r': '3',
    's': '4',
    'd': '5',
    'f': '6',
    'z': '7',
    'x': '8',
    'c': '9',
    ',': '0'
  };

  function _showLoading() {
    loading = true;
    FxaModuleOverlay.show('fxa-connecting');
    $('fxa-enter-otp').dataset.subid = 'loading';
    ViewManager.setSkMenu();
  }

  function _hideLoading() {
    loading = false;
    FxaModuleOverlay.hide();
    $('fxa-enter-otp').dataset.subid = '';
    ViewManager.setSkMenu();
  }

  function _showResend() {
    resendShown = true;
    $('fxa-enter-otp').dataset.subid = 'failed';
    ViewManager.setSkMenu();
  }

  function _hideResend() {
    resendShown = false;
    $('fxa-enter-otp').dataset.subid = '';
    ViewManager.setSkMenu();
  }

  function _showVerified(l10id) {
    var text = window.api.l10n.get(l10id);
    $('otp-verified').innerHTML = text;
    $('fxa-enter-otp').dataset.subid = 'done';
    ViewManager.setSkMenu();
  }

  function _fillInCode(otp) {
    currentPasscode = otp;
    showOtp();
  }

  function _blocking() {
    $('fxa-enter-otp').dataset.subid = '';
    ViewManager.setSkMenu();
  }

  function _unblocking() {
    $('fxa-enter-otp').dataset.subid = 'unblocking';
    ViewManager.setSkMenu();
  }

  function onKeyDown(evt) {
    if (resendShown) {
      return;
    }

    var keycode = qwertyKeyMapping[evt.key] || evt.key;
    var needShow = false;

    switch (keycode) {
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
      case '0':
        evt.preventDefault();
        evt.stopPropagation();
        if (CODELENGTH != currentPasscode.length) {
          currentPasscode += keycode;
          needShow = true;
        }
        break;
      case 'Backspace':
      case 'SoftLeft':
        if (currentPasscode.length) {
          evt.preventDefault();
          evt.stopPropagation();
          currentPasscode = currentPasscode.substr(0, currentPasscode.length - 1);
          needShow = true;
        }
        break;
    }

    if (needShow) {
      showOtp();
    }
  }

  function showOtp() {
    var codes = $('otp-count-down').querySelectorAll('.code');
    for (var i = 0; i < codes.length; i++) {
      codes[i].innerText = currentPasscode.charAt(i);
    }
    if (CODELENGTH <= currentPasscode.length) {
      _unblocking();
    } else {
      _blocking();
    }
  }

  var Module = Object.create(FxaModule);
  Module.init = function init(options) {
    // Cache static HTML elements
    this.importElements(
      'fxa-otp-time-remaining',
      'otp-sms-sent-message',
      'otp-count-down',
      'otp-count-down-end',
      'otp-count-down-end-msg',
      'otp-verified',
      'otp-verified-block'
    );

    this.options = options || {};

    var phoneNumber = this.options.phone;
    var _ = window.api.l10n.get;
    var text = _('fxa-sms-has-been-sent-message-2', {
      phoneNumber: phoneNumber
    });

    this.otpSmsSentMessage.innerHTML = text;
    this.otpCountDownEnd.innerText = this.options.phone;

    this.startCountdownRemaningTime();
    this.onCountingDown();

    this.cancel = false;
    this.verified = false;

    if (!this.initialized) {
      window.addEventListener('keydown', onKeyDown);
      return;
    }

    this.initialized = true;
  };

  Module.startCountdownRemaningTime = function() {
    this.stopCountdownRemaningTime();
    // Create deadline 2 minutes from now.
    var currentTime = Date.parse(new Date());
    endTime = new Date(currentTime + COUNTDOWN_TIME);
    // Set interval timer to refresh remaining time.
    this.updateRemainingTime();
    countdownTimer = setInterval(() => {
      this.updateRemainingTime();
    }, COUNTDOWN_INTERVAL_TIME);
  };

  Module.stopCountdownRemaningTime = function() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      endTime = null;
    }
  };

  Module.updateRemainingTime = function() {
    var currentTimeRemaining = _getTimeRemaining(endTime);
    this.fxaOtpTimeRemaining.textContent =
      currentTimeRemaining.minutes +
      ':' +
      ('0' + currentTimeRemaining.seconds).slice(-2);

    if ((currentTimeRemaining.total <= 0) && countdownTimer) {
      this.stopCountdownRemaningTime();
      this.onCountDownEnd();
    }
  };

  Module.onCountDownEnd = function() {
    _showResend();
    this.otpSmsSentMessage.hidden = true;
    this.otpCountDownEndMsg.hidden = false;
    this.otpCountDownEnd.hidden = false;
    this.otpCountDown.hidden = true;
  };

  Module.onCountingDown = function() {
    _hideResend();
    this.otpSmsSentMessage.hidden = false;
    this.otpCountDownEndMsg.hidden = true;
    this.otpCountDownEnd.hidden = true;
    this.otpCountDown.hidden = false;

    _fillInCode('');
  };

  Module.triggerEmailVerification = function () {
    if (!this.options.uid || !_checkEmail(this.options.email)) {
      accountUtils.debug(
        'account creation requestEmailVerification empty uid or email');
      return;
    }
    FxModuleServerRequest.requestEmailVerification(this.options.email,
      this.options.uid,
      () => {
        accountUtils.debug('account creation requestEmailVerification success');
      },
      () => {
        accountUtils.debug('account creation fails requestEmailVerification');
      }
    );
  };

  Module.onOtpVerified = function () {
    this.stopCountdownRemaningTime();
    this.verified = true;
    // Do not show extra UI for edit phone number.
    if (this.options.editPhone) {
      setTimeout(() => {
        window.parent.FxAccountsUI.done({ success: true });
      }, 1000);

      return;
    }

    this.otpSmsSentMessage.hidden = true;
    this.otpCountDownEndMsg.hidden = true;
    this.otpCountDownEnd.hidden = true;
    this.otpCountDown.hidden = true;
    this.otpVerifiedBlock.hidden = false;

    $('fxa-module-header').classList.add('fullscreen');
    $('step-container').classList.add('account-created-fullscreen');

    var l10nId = 'fxa-will-send-email';
    if (this.options.altPhone && this.options.email) {
      l10nId = 'fxa-verify-hint-both';
    } else if (this.options.altPhone) {
      l10nId = 'fxa-verify-hint-alt-phone';
    } else if (this.options.email) {
      l10nId = 'fxa-verify-hint-email';
    }
    _showVerified(l10nId);

    if (this.options.email) {
      this.triggerEmailVerification();
    }
  };

  Module.onOTPReceived = function(otp) {
    if (this.cancel) {
      return;
    }
    _fillInCode(otp);
    accountUtils.debug('--> onOTPReceived(): otp = ' + otp +
      ', phone number = ' + this.options.phone);
  };

  Module.onOTPSmsReceived = function(msg) {
    if (this.cancel) {
      return;
    }

    var config = {};
    config.titleId = 'sms';
    config.bodyId = 'otp-sms-received';
    config.bodyArgs = {sms: msg, time: COUNTDOWN_TIME_MIN};
    showHint(config);
    accountUtils.debug('--> onOTPSmsReceived(): msg = ' + msg +
      ', phone number = ' + this.options.phone);
  };

  Module.resolvePhoneVerification = function(otp) {
    _showLoading();
    FxModuleServerRequest.resolvePhoneVerification(
      this.options.phone,
      this.options.uid,
      this.options.verificationId,
      otp,
      (response) => { // onServerResponse
        accountUtils.debug(response);
        NavigationMap.currentActivatedLength = 0;
        _hideLoading();
        accountUtils.debug('--> onOTPReceived setParam success since response.authenticated');
        this.onOtpVerified();
      }, (response) => { // onError
        // Verify failed, user might have to resend message.
        _hideLoading();
        accountUtils.debug('-->  onError response = ');
        accountUtils.debug(response);
        NavigationMap.currentActivatedLength = 0;
        // Verify failed, user might have to resend message.
        _fillInCode('');
        this.showErrorResponse(response);
      });
  };

  Module.onNext = function onNext() {
    // Call send OTP API and show coutDown UI
    if (this.cancel) {
      return;
    }

    if (resendShown) {
      // Resend API called
      // Refresh UI.
      this.onCountingDown();
      this.startCountdownRemaningTime();

      FxModuleServerRequest.requestPhoneVerification(this.options.phone,
        this.options.uid,
        (response) => {
          if (!response || (response && !response.verificationId)) {
            this.showErrorResponse({
              error: 'error'
            });
            return;
          }
          FxaModuleManager.paramsRetrieved.verificationId = response.verificationId;
          accountUtils.debug('account success requestPhoneVerification');
        }, (error) => {
          accountUtils.debug('account fail requestPhoneVerification');
          accountUtils.debug(error);
          this.stopCountdownRemaningTime();
          this.onCountDownEnd();
          this.showErrorResponse(error);
        });

      return;
    }

    if (currentPasscode.length < CODELENGTH) {
      return;
    }

    this.resolvePhoneVerification(currentPasscode.substr(0, CODELENGTH));
  };

  Module.onBack = function onBack() {
    if (this.verified) {
      window.parent.FxAccountsUI.done({
        success: true
      });
      return;
    }
    if (resendShown) {
      this.cancel = true;
      if (this.options.newPhone) {
        // Based on current UX
        FxaModuleNavigation.goBack(3);
        FxaModuleManager.paramsRetrieved.newPhone = '';
      } else if (this.options.newPhoneUnverified) {
        // Sign in with unverified phone
        FxaModuleNavigation.goBack(1);
      }

      return;
    }
    if (loading) {
      _hideLoading();
      return;
    }

    if (!resendShown && currentPasscode.length > 0) {
      return;
    }

    if (this.confirmationShown) {
      this.confirmationShown = false;
      return;
    }

    var config = {};
    config.bodyId = 'fxa-confirm-dialog-body';
    if (this.options.editPhone) {
      config.bodyId = 'fxa-confirm-leave-phone-body';
    } else if (this.options.newPhone) {
      config.bodyId = 'fxa-confirm-dialog-body';
    }

    _showConfirmation(config, () => {
      this.cancel = true;
      if (this.options.newPhone) {
        // Based on current UX
        FxaModuleNavigation.goBack(3);
        FxaModuleManager.paramsRetrieved.newPhone = '';
      } else if (this.options.newPhoneUnverified) {
        // Sign in with unverified phone
        FxaModuleNavigation.goBack(1);
      } else {
        window.parent.FxAccountsUI.done(FxaModuleStates.DONE);
      }
    })
    this.confirmationShown = true;
  };

  Module.onDone = function onDone() {
    window.removeEventListener('keydown', onKeyDown);
    currentPasscode = '';
  };

  return Module;
}());
