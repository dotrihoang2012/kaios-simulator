/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global $, FxaModuleStates, FxaModule, FxModuleServerRequest, FxaModuleManager,
     FxaModuleOverlay, ViewManager, accountUtils, createRegionSelect, loadPhoneUtils, retryFailsHint,
     _getInternationalPhoneNumber, _loadPhoneNumber, _rightPasswordRetryRest, _validePassword,
     _wrongPaswordRetry */
/* exported FxaModuleLoginPhoneNumber */

'use strict';

/**
 * This module checks the validity of a phone number, and if valid,
 * determines which screen to go next.
 */

 /* eslint-disable-next-line no-unused-vars */
 var FxaModuleLoginPhoneNumber = (function() {
  var loading;
  var region = { l10nId: 'fxa-cc-unitedstates', value: '+1'};
  var subid = '';

  function _showLoading(lanId) {
    loading = true;
    let lmsg = 'fxa-connecting';
    if (lanId) {
      lmsg = lanId;
    }
    FxaModuleOverlay.show(lmsg);
    $('fxa-login-phone-number').dataset.subid = 'loading';
    ViewManager.setSkMenu();
  }

  function _hideLoading() {
    loading = false;
    FxaModuleOverlay.hide();
    $('fxa-login-phone-number').dataset.subid = subid;
    ViewManager.setSkMenu();
  }

  function _showRegion(ccSelected) {
    var _ = window.api.l10n.get;
    ccSelected.textContent = _(region.l10nId) + ' ' + region.value;

    ViewManager.setSkMenu();
  }
  function _unsetParams() {
    FxaModuleManager.setParam('resetMethods', '');
    FxaModuleManager.setParam('isPhoneForgot', '');
  }
  function _onEmailForgot() {
    document.querySelectorAll(".show-email-forgot").forEach(function(item) {
      item.hidden = false;
    });
    document.querySelectorAll(".hide-email-forgot").forEach(function(item) {
      item.remove();
    });

    window.parent.Service.request('SystemToaster:show',
      {textL10n:'email-unverified-phone-forgetPWD'});

    subid = 'emailForgot';
    $('fxa-login-phone-number').dataset.subid = 'emailForgot';
    ViewManager.setSkMenu();
    ViewManager.updateTitle('fxa-reset-password-error-title');
  }

  var Module = Object.create(FxaModule);
  Module.init = function init(options) {
    this.options = options || {};
    // Cache static HTML elements
    this.importElements(
      'fxa-cc-select',
      'fxa-cc-selected',
      'fxa-phone-number-input',
      'fxa-pw-input',
      'fxa-show-pw'
    );

    _unsetParams();

    if (this.initialized) {
      _showRegion(this.fxaCcSelected);
      ViewManager.setSkMenu();

      return;
    }

    createRegionSelect(_loadPhoneNumber(), (aRegion) => {
      region = aRegion;
      this.fxaPhoneNumberInput.value = aRegion.nationalNumber;
      _showRegion(this.fxaCcSelected);
    });

    var placeholder = window.api.l10n.get('fxa-phone-number-label');
    this.fxaPhoneNumberInput.setAttribute('placeholder', placeholder);

    var placeholderPassword = window.api.l10n.get('fxa-password');
    this.fxaPwInput.setAttribute('placeholder', placeholderPassword);

    this.fxaCcSelect.addEventListener(
      'change', (event) => {
        region.l10nId = event.detail.l10nId;
        region.value = event.detail.value;
        _showRegion(this.fxaCcSelected);
      }
    );


    if (this.options.isEmailForgot) {
      _onEmailForgot();

      this.initialized = true;
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

    ViewManager.setSkMenu();

    if (this.options.redirectFromEmail) {
      window.parent.Service.request('SystemToaster:show',
        {textL10n:'email-unverified-phone-login'});
    }

    // Avoid to add listener twice
    this.initialized = true;
  };

  Module.onNext = function onNext(gotoNextStepCallback, isPhoneForgot) {
    if (loading) {
      return;
    }

    var cc = this.fxaCcSelect.value;
    var number = this.fxaPhoneNumberInput.value;
    var internationalPhoneNumber = _getInternationalPhoneNumber(number, cc);
    if (internationalPhoneNumber == '') {
      this.showErrorResponse({
        error: "PHONE_EMPTY"
      });
      return;
    }

    loadPhoneUtils(internationalPhoneNumber).then((phone) => {
      if (!phone) {
        this.showErrorResponse({
          error: "INVALID_PHONE_NUMBER"
        });
        return;
      }

      FxaModuleManager.setParam('phone', internationalPhoneNumber);

      if (this.cancel) {
        return;
      }

      if (this.options.isEmailForgot) {
        _showLoading();
        FxModuleServerRequest.resetPasswordInit(internationalPhoneNumber,
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

      if (isPhoneForgot) {
        _showLoading();
        FxModuleServerRequest.resetPasswordInit(internationalPhoneNumber,
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
            if (e && e.error === 'UNVERIFIED_ACCOUNT' && !this.options.redirectFromEmail) {
              FxaModuleManager.setParam('isPhoneForgot', true);
              gotoNextStepCallback(FxaModuleStates.SIGN_IN);

              return;
            }

            this.showErrorResponse(e);
          }
        );

        return;
      }

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
        FxModuleServerRequest.signIn(internationalPhoneNumber, this.fxaPwInput.value,
          () => {
            _hideLoading();
            _rightPasswordRetryRest();
            accountUtils.debug('account signIn success');
            FxaModuleManager.setParam('success', true);
            FxaModuleManager.setParam('verifiedResult', true);
            window.parent.FxAccountsUI.done(FxaModuleManager.paramsRetrieved);
          }, response => {
            _hideLoading();
            if (response && response.error && response.error === 'UNVERIFIED_ACCOUNT') {
              accountUtils.debug('account SignIn fail');
              accountUtils.debug(response.error);
              this.showErrorResponse({error: 'ACCOUNT_DOES_NOT_EXIST'});
              return;
            }

            accountUtils.debug('account signIn fail');
            accountUtils.debug(response);
            if ('INVALID_PASSWORD' == (response && response.error)) {
              _wrongPaswordRetry();
            }
            this.showErrorResponse(response);
          }
        );
      });
    });
  };

  Module.onBack = function onBack(gotoBackStepCallback) {
    if (this.options.isEmailForgot) {
      return;
    }
    // We are in forgot password mode
    this.onNext(gotoBackStepCallback, true);
  };

  Module.onDone = function onDone() {
    _hideLoading();
  };
  return Module;
}());
