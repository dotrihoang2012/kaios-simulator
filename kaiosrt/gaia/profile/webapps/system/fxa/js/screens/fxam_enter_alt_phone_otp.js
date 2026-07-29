/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global $, FxaModule, FxModuleServerRequest, FxaModuleOverlay, FxaModuleManager,
     NavigationMap, ViewManager, accountUtils, _getTimeRemaining, _showConfirmation */
/* exported FxaModuleEnterAltPhoneOTP */

'use strict';

 /* eslint-disable-next-line no-unused-vars */
var FxaModuleEnterAltPhoneOTP = (function() {
  var endTime;
  var countdownTimer = null;
  var COUNTDOWN_TIME = 2 * 60 * 1000;
  var COUNTDOWN_INTERVAL_TIME = 1000;
  var loading, resendShown;
  var currentPasscode = '';
  var CODELENGTH = 4;
  var subid = '';

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
    $('fxa-enter-alt-phone-otp').dataset.subid = 'loading';
    ViewManager.setSkMenu();
  }

  function _hideLoading() {
    loading = false;
    FxaModuleOverlay.hide();
    $('fxa-enter-alt-phone-otp').dataset.subid = subid;
    ViewManager.setSkMenu();
  }

  function _showResend() {
    resendShown = true;
    $('fxa-enter-alt-phone-otp').dataset.subid = 'failed';
    ViewManager.setSkMenu();
  }

  function _hideResend() {
    resendShown = false;
    $('fxa-enter-alt-phone-otp').dataset.subid = '';
    ViewManager.setSkMenu();
  }

  function _blocking() {
    subid = '';
    $('fxa-enter-alt-phone-otp').dataset.subid = '';
    ViewManager.setSkMenu();
  }

  function _unblocking() {
    subid = 'unblocking';
    $('fxa-enter-alt-phone-otp').dataset.subid = 'unblocking';
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
    var codes = $('count-down').querySelectorAll('.code');
    for (var i = 0; i < codes.length; i++) {
      codes[i].innerText = currentPasscode.charAt(i);
    }
    if (CODELENGTH === currentPasscode.length) {
      _unblocking();
    } else {
      _blocking();
    }
  }

  var Module = Object.create(FxaModule);
  Module.init = function init(options) {
    this.initialized = false;
    this.options = options || {};
    // Cache static HTML elements
    this.importElements(
      'fxa-time-remaining',
      'sms-sent-message',
      'count-down',
      'count-down-end',
      'count-down-end-msg'
    );

    var altPhone = this.options.altPhone;
    var _ = window.api.l10n.get;
    var text = _('fxa-alt-phone-otp-sent', {
      altPhone: altPhone
    });

    this.smsSentMessage.innerHTML = text;
    this.countDownEnd.innerText = altPhone;
    this.startCountdownRemaningTime();

    // Return early, donot call requestPhoneVerification
    if (this.options.phoneForgot) {
      _showLoading();

      // Update Title to Reset Password
      ViewManager.updateTitle('fxa-reset-password-error-title');
      text = _('fxa-passcode-from-altphone-msg', {
        altPhone: altPhone
      });
      this.smsSentMessage.innerHTML = text;

      FxModuleServerRequest.resetPasswordMethodApply(this.options.altPhone,
        () => {
          // Wait
          _hideLoading();
          accountUtils.debug('account resetPasswordMethodApply success' + this.options.altPhone);
        },
        (e) => {
          _hideLoading();
          accountUtils.debug('account resetPasswordMethodApply failed' + this.options.altPhone);
          this.showErrorResponse(e);
          this.stopCountdownRemaningTime();
          this.onCountDownEnd();
        }
      );

      if (!this.initialized) {
        window.addEventListener('keydown', onKeyDown);
      }

      this.initialized = true;

      return;
    }

    // Need two steps,
    // 1. request alt phone otp, save id.
    // 2. verify otp user input with previous id.

    // Forget Password request
    // "id": "K57aMTe79g5T-wxQexpd9w_6em9zermlSH34EmE-",
    // "target": "+1******4321",
    // "contact": "+19495069988"
    if (this.options.requestAltPhoneOtp) {
      FxModuleServerRequest.requestPhoneVerification(this.options.altPhone,
        this.options.uid,
        (response) => {
          _hideLoading();
          if (!response || (response && !response.verificationId)) {
            this.showErrorResponse({
              error: 'error'
            });
            return;
          }
          this.options.verificationId = response.verificationId;
          FxaModuleManager.setParam('verificationId', response.verificationId);
          FxaModuleManager.setParam('expireAt', Date.now() + COUNTDOWN_TIME);
          accountUtils.debug('account success requestPhoneVerification');
        },
        (error) => {
          accountUtils.debug('account fail requestPhoneVerification');
          accountUtils.debug(error);
          _hideLoading();
          this.stopCountdownRemaningTime();
          this.onCountDownEnd();
          this.showErrorResponse(error);
        }
      );
    }

    if (!this.initialized) {
      window.addEventListener('keydown', onKeyDown);
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
    this.fxaTimeRemaining.textContent =
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
    this.smsSentMessage.hidden = true;
    this.countDownEndMsg.hidden = false;
    this.countDownEnd.hidden = false;
    this.countDown.hidden = true;
  };

  Module.onCountingDown = function() {
    _hideResend();
    this.smsSentMessage.hidden = false;
    this.countDownEndMsg.hidden = true;
    this.countDownEnd.hidden = true;
    this.countDown.hidden = false;

    currentPasscode = '';
    showOtp();
  };

  Module.onNext = function onNext() {
    if (this.cancel) {
      return;
    }

    if (this.options.phoneForgot && resendShown) {
      _showLoading();
      FxModuleServerRequest.resetPasswordMethodApply(this.options.altPhone,
        () => {
          _hideLoading();
          this.onCountingDown();
          this.startCountdownRemaningTime();
          // Wait
          accountUtils.debug('account resetPasswordMethodApply success' + this.options.altPhone);
        },
        (e) => {
          _hideLoading();
          accountUtils.debug('account resetPasswordMethodApply failed' + this.options.altPhone);
          this.stopCountdownRemaningTime();
          this.onCountDownEnd();
          this.showErrorResponse(e);
        }
      )

      return;
    }

    if (resendShown) {
      _showLoading();
      FxModuleServerRequest.requestPhoneVerification(this.options.altPhone,
        this.options.uid,
        (response) => {
          _hideLoading();
          if (!response || (response && !response.verificationId)) {
            this.showErrorResponse({
              error: 'error'
            });
            return;
          }
          this.options.verificationId = response.verificationId;
          FxaModuleManager.setParam('verificationId', response.verificationId);
          FxaModuleManager.setParam('expireAt', Date.now() + COUNTDOWN_TIME);
          accountUtils.debug('account success requestPhoneVerification');
          // Resend API called
          // Refresh UI.
          this.onCountingDown();
          this.startCountdownRemaningTime();
        }, (error) => {
          _hideLoading();
          accountUtils.debug('account fail requestPhoneVerification');
          accountUtils.debug(error);
          this.stopCountdownRemaningTime();
          this.onCountDownEnd();
          this.showErrorResponse(error);
        });
      return;
    }

    if (currentPasscode.length !== CODELENGTH) {
      return;
    }

    // Verify forgot password
    if (this.options.phoneForgot) {
      _showLoading();
      FxModuleServerRequest.resetPasswordPhoneValidate(currentPasscode, (link) => {
        _hideLoading();
        window.parent.FxAccountsUI.showUrl(link);
        window.parent.FxAccountsUI.done();
      }, (e) => {
        _hideLoading();
        currentPasscode = '';
        showOtp();
        this.showErrorResponse(e);
      })

      return;
    }

    // Validate second phone
    _showLoading();
    FxModuleServerRequest.resolvePhoneVerification(
      this.options.altPhone,
      this.options.uid,
      this.options.verificationId,
      currentPasscode,
      (response) => { // onServerResponse
        _hideLoading();
        accountUtils.debug(response);
        NavigationMap.currentActivatedLength = 0;
        accountUtils.debug('--> resolvePhoneVerification altPhone done');
        window.parent.FxAccountsUI.done({
          success: true
        });
      }, (response) => { // onError
        _hideLoading();
        accountUtils.debug(response);
        accountUtils.debug('-->  onError response = ');
        accountUtils.debug(response);
        NavigationMap.currentActivatedLength = 0;
        // Verify failed, user might have to resend message.
        _hideLoading();
        currentPasscode = '';
        showOtp();
        this.showErrorResponse(response);
      }
    );
  };

  Module.onBack = function onBack() {
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
    config.bodyId = 'fxa-confirm-leave-alt-phone-body';
    if (this.options.phoneForgot) {
      config.bodyId = 'fxa-confirm-leave-forgot-phone';
    }
    _showConfirmation(config, () => {
      this.cancel = true;
      window.removeEventListener('keydown', onKeyDown);
      // window.parent.FxAccountsUI.done(FxaModuleStates.DONE);
      // Returns verificationId and expireAt if any.
      FxaModuleManager.setParam('success', false);
      window.parent.FxAccountsUI.done(FxaModuleManager.paramsRetrieved);
    });
    this.confirmationShown = true;
  };

  Module.onDone = function onDone() {
    window.removeEventListener('keydown', onKeyDown);
    currentPasscode = '';
  };
  return Module;
}());
