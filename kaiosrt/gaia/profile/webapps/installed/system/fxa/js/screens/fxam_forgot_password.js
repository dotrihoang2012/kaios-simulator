/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global FxaModuleStates, FxaModuleUI, FxaModule, FxaModuleNavigation,
   FxModuleServerRequest, FxaModuleOverlay, $, FxaModuleManager, BrowserFrame */
/* exported FxaModuleSigning */

'use strict';

/**
 * This module checks the validity of an email address, and if valid,
 * determines which screen to go next.
 */

var FxaModuleForgotPassword = (function () {
  var self = this;

  function _showLoading() {
    FxaModuleOverlay.show('fxa-connecting');
    $('fxa-forgot-password').dataset.subid = 'loading';
    ViewManager.setSkMenu();
  }

  function _hideLoading() {
    FxaModuleOverlay.hide();
    $('fxa-forgot-password').dataset.subid = '';
    ViewManager.setSkMenu();
  }

  function _showError() {
    $('fxa-forgot-password-error').hidden = false;
    $('fxa-forgot-password-content').hidden = true;
  }

  function _hideError() {
    $('fxa-forgot-password-error').hidden = true;
    $('fxa-forgot-password-content').hidden = false;
  }

  var Module = Object.create(FxaModule);
  Module.init = function init(options, gotoNextStepCallback) {
    this.options = options || {};
    _showLoading();
    _hideError();
    this.importElements(
      'fxa-to-email',
      'to-email',
      'fxa-alt-phone',
      'to-alt-phone',
      'fxa-forgot-password-error'
    );

    var altPhoneMethod = '';
    var emailVerified = false;
    // We have the spec that honor unverifed contact first.
    // Also email has higher priority than alternative phone.
    var unverifiedEmailFound = false;
    var unverifiedaltPhoneFound = false;
    if (this.options.resetMethods && Array.isArray(this.options.resetMethods)) {
      this.options.resetMethods.forEach((method) => {
        if (method.contact && method.contact.indexOf('@') > -1) {
          if (!unverifiedEmailFound) {
            if (!method.verified) {
              unverifiedEmailFound = true;
            }
            FxaModuleManager.setParam('toEmail', method.contact);
            this.options.toEmail = method.contact;
            emailVerified = method.verified;
          }
        } else {
          if (!unverifiedaltPhoneFound) {
            if (!method.verified) {
              unverifiedaltPhoneFound = true;
            }
            FxaModuleManager.setParam('altPhone', method.contact);
            altPhoneMethod = method;
          }
        }
      });
    }

    // Per spec, if email provided, we use email
    if (this.options.toEmail) {
      FxaModuleManager.setParam('emailForgot', true);
      if (emailVerified) {
        FxaModuleManager.setParam('emailVerified', true);
      }
      this.sendToEmail(gotoNextStepCallback);

      return;
    } else if (altPhoneMethod) {
      setTimeout(() => {
        this.sendToAltPhone(gotoNextStepCallback);
      }, 500);

      return;
    }

    ViewManager.setSkMenu();
    _showError();
    this.toEmail.hidden = true;
    this.toAltPhone.hidden = true;
  };

  Module.onNext = function onNext(gotoNextStepCallback) {
    var self = this;
    var email = this.fxaResetEmailInput.value;
    if (!_checkEmail(email)) {
      self.showErrorResponse({ error: 'INVALID_EMAIL' });
      return;
    }
    _showLoading();
    FxModuleServerRequest.resetPassword(
      email,
      function onServerResponse(response) {
        _hideLoading();
        gotoNextStepCallback(FxaModuleStates.FORGOT_PASSWORD_SUCCESS);
      },
      function onError(response) {
        _hideLoading();
        self.showErrorResponse(response);
      }
    );
  };

  Module.onBack = function onBack() {
    _hideLoading();
  };

  Module.sendToEmail = function sendToEmail(gotoNextStepCallback) {
    // Email is hidden format like  a**b@gmail.com
    // Make request to reset to email
    FxModuleServerRequest.resetPasswordMethodApply(this.options.toEmail,
      () => {
        _hideLoading();
        gotoNextStepCallback(FxaModuleStates.FORGOT_PASSWORD_SUCCESS);
      },
      (e) => {
        _hideLoading();
        this.showErrorResponse(e);
        _showError();
      }
    );
  };

  Module.sendToAltPhone = function sendToAltPhone(gotoNextStepCallback) {
    // Make request to reset to altPhone
    FxaModuleManager.setParam('phoneForgot', true);
    _hideLoading();
    gotoNextStepCallback(FxaModuleStates.VERIFY_ALT_PHONE);
  }

  return Module;
}());
