/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global $, FxaModuleStates, FxaModule, FxModuleServerRequest, FxaModuleOverlay,
    FxaModuleManager, ViewManager, NavigationMap, accountUtils, retryFailsHint,
    _checkEmail, _rightPasswordRetryRest, _validePassword, _wrongPaswordRetry */
/* exported FxaModuleSignIn */

'use strict';

/**
 * This module checks the validity of an email address, and if valid,
 * determines which screen to go next.
 */

  /* eslint-disable-next-line no-unused-vars */
var FxaModuleSignIn = (function () {
  var subid = '';

  function _showLoading(lanId) {
    let lmsg = 'fxa-connecting';
    if (lanId) {
      lmsg = lanId;
    }
    FxaModuleOverlay.show(lmsg);
    $('fxa-sign-in').dataset.subid = 'loading';
    ViewManager.setSkMenu();
  }

  function _hideLoading() {
    FxaModuleOverlay.hide();
    $('fxa-sign-in').dataset.subid = subid;
    ViewManager.setSkMenu();
  }

  function _unsetParams() {
    FxaModuleManager.setParam('resetMethods', '');
    FxaModuleManager.setParam('isEmailForgot', '');
    FxaModuleManager.setParam('redirectFromEmail', '');
  }

  function _onPhoneForgot() {
    document.querySelectorAll(".show-phone-forgot").forEach(function(item) {
      item.hidden = false;
    });
    document.querySelectorAll(".hide-phone-forgot").forEach(function(item) {
      item.remove();
    });

    subid = 'phoneForgot';
    $('fxa-sign-in').dataset.subid = 'phoneForgot';
    ViewManager.setSkMenu();
    ViewManager.updateTitle('fxa-reset-password-error-title');
  }

  var Module = Object.create(FxaModule);
  Module.init = function init(options) {
    this.options = options || {};
    // Cache static HTML elements
    this.importElements(
      'fxa-email-input',
      'fxa-pw-input',
      'fxa-show-pw'
    );

    _unsetParams();

    var placeholder = window.api.l10n.get('fxa-placeholder');
    this.fxaEmailInput.setAttribute('placeholder', placeholder);

    var placeholderPassword = window.api.l10n.get('fxa-password');
    this.fxaPwInput.setAttribute('placeholder', placeholderPassword);

    if (this.options.isPhoneForgot) {
      _onPhoneForgot();
      window.parent.Service.request('SystemToaster:show',
        {textL10n:'phone-unverified-email-forgetPWD'});

      this.initialized = true;

      return;
    }

    if (this.initialized) {
      return;
    }

    this.fxaShowPw.addEventListener(
      'click',
       onShowPwClick.bind(this)
    );

    function onShowPwClick() {
      if (this.fxaShowPw.checked) {
        this.fxaPwInput.type = 'text';
      } else {
        this.fxaPwInput.type = 'password';
      }
    }

    // Avoid to add listener twice
    this.initialized = true;
  };

  Module.onNext = function onNext(gotoNextStepCallback, isEmailForgot) {
    if (!this.fxaEmailInput.value) {
      this.showErrorResponse({ error: "EMAIL_EMPTY" });
      return;
    }
    if (!_checkEmail(this.fxaEmailInput.value)) {
      this.showErrorResponse({ error: "INVALID_EMAIL" });
      return;
    }

    var email = this.fxaEmailInput.value;
    FxaModuleManager.setParam('email', email);

    if (this.options.isPhoneForgot) {
      _showLoading();
      FxModuleServerRequest.resetPasswordInit(email,
        (methods) => {
          if (methods && Array.isArray(methods)) {
            FxaModuleManager.setParam('resetMethods', methods);
            gotoNextStepCallback(FxaModuleStates.FORGOT_PASSWORD);
          } else {
            _hideLoading();
            this.showErrorResponse({ error: 'NO_RETRIEVALE_METHOD' });
          }
        }, (e) => {
          _hideLoading();
          if (e && e.error === 'UNVERIFIED_ACCOUNT') {
            this.showErrorResponse({ error: 'NO_RETRIEVALE_METHOD' });

            return;
          }

          this.showErrorResponse(e);
        }
      );

      return;
    }

    if (isEmailForgot) {
      _showLoading();
      FxModuleServerRequest.resetPasswordInit(email,
        (methods) => {
          if (methods && Array.isArray(methods)) {
            FxaModuleManager.setParam('resetMethods', methods);
            gotoNextStepCallback(FxaModuleStates.FORGOT_PASSWORD);
          } else {
            _hideLoading();
            this.showErrorResponse({ error: 'NO_RETRIEVALE_METHOD' });
          }
        }, (e) => {
          _hideLoading();
          if (e && e.error === 'UNVERIFIED_ACCOUNT') {
              FxaModuleManager.setParam('isEmailForgot', true);
              gotoNextStepCallback(FxaModuleStates.ENTER_PHONE_NUMBER_LOGIN);

            return;
          }

          this.showErrorResponse(e);
        }
      );

      return;
    }

    // Check password retry times
    window.parent.asyncStorage.getItem('checkpassword.enabletime', (value) => {
      if (value) {
        var currentTime = (new Date()).getTime();
        if (currentTime < value) {
          retryFailsHint(value);
          return;
        }
      }

      var error = _validePassword(this.fxaPwInput.value);
      if (error) {
        this.showErrorResponse({ error: error });
        return;
      }

      _showLoading('fxa-sining-in');
      FxModuleServerRequest.signIn(
        email,
        this.fxaPwInput.value,
        () => {
          _rightPasswordRetryRest();
          NavigationMap.currentActivatedLength = 0;
          _hideLoading();
          FxaModuleManager.setParam('success', true);
          window.parent.FxAccountsUI.done(FxaModuleManager.paramsRetrieved);
        },
        (response) => {
          _hideLoading();
          NavigationMap.currentActivatedLength = 0;
          if (response && response.error && response.error === 'UNVERIFIED_ACCOUNT') {
            accountUtils.debug('account SignIn fail');
            accountUtils.debug(response.error);
            FxaModuleManager.setParam('redirectFromEmail', true);
            gotoNextStepCallback(FxaModuleStates.ENTER_PHONE_NUMBER_LOGIN);

            return;
          }
          if ('INVALID_PASSWORD' == (response && response.error)) {
            _wrongPaswordRetry();
          }
          this.showErrorResponse(response);
        }
      );
    });
  };
  Module.onBack = function onBack(gotoBackStepCallback) {
    if (this.options.isPhoneForgot) {
      return;
    }
    this.onNext(gotoBackStepCallback, true);
  };
  Module.onDone = function onDone() {
    _hideLoading();
  };
  return Module;
}());
