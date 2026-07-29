/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global FxaModule, $, ViewManager, NavigationMap, FxModuleServerRequest, FxaModuleOverlay,
     retryFailsHint, accountUtils, _passwdPolicyCheck, _rightPasswordRetryRest, _wrongPaswordRetry */
/* exported FxaModuleChangePassword */

'use strict';

/**
 * This module checks the validity of password given email address, and if
 * valid, determine which screen to change password.
 */

 /* eslint-disable-next-line no-unused-vars */
var FxaModuleChangePassword = (function () {
  function _checkPassword(passwordOld, passwordEl, passwordCheck) {
    var passwordValue = passwordEl.value;
    if (!passwordValue || passwordValue.length < 8) {
      return 'PASSWORD_LESS';
    }

    if (passwordValue.length > 20) {
      return 'PASSWORD_MORE';
    }

    if (passwordValue !== passwordCheck.value) {
      return 'PASSWORD_DONT_MATCH';
    }

    if (!_passwdPolicyCheck(passwordValue)) {
      return 'PASSWORD_ERROR';
    }

    if (passwordValue === passwordOld.value) {
      return 'PASSWORD_OLD_NEW_SAME';
    }

    return '';
  }

  function _cleanForm(passwordEl, passwordCheck) {
    passwordEl.value = '';
    passwordCheck.value = '';
  }

  function _onShowPwClick(checkEl, newPasswordEl, confirmPasswordEl, orgPasswordEl) {
    if (checkEl.checked) {
      orgPasswordEl.type = 'text';
      newPasswordEl.type = 'text';
      confirmPasswordEl.type = 'text';
    } else {
      orgPasswordEl.type = 'password';
      newPasswordEl.type = 'password';
      confirmPasswordEl.type = 'password';
    }
  }

  function _showLoading() {
    FxaModuleOverlay.show('fxa-changing-password');
    $('fxa-change-password').dataset.subid = 'loading';
    ViewManager.setSkMenu();
  }

  function _hideLoading() {
    $('fxa-change-password').dataset.subid = '';
    ViewManager.setSkMenu();
    FxaModuleOverlay.hide();
  }

  var Module = Object.create(FxaModule);
  Module.init = function init() {
    if (!this.initialized) {
      // Cache DOM elements
      this.importElements(
        'fxa-pw-input',
        'fxa-new-pw-input',
        'fxa-confirm-pw-input',
        'fxa-show-pw'
      );
      // Add listeners
      this.fxaShowPw.addEventListener('click', (event) => {
        _onShowPwClick(event.target, this.fxaNewPwInput,
                       this.fxaConfirmPwInput, this.fxaPwInput);
      });

      // Avoid repeated initialization
      this.initialized = true;
    }
    _cleanForm(this.fxaNewPwInput, this.fxaConfirmPwInput);
  };

  Module.onNext = function onNext() {
    var error = _checkPassword(this.fxaPwInput, this.fxaNewPwInput, this.fxaConfirmPwInput);
    if (error) {
      this.showErrorResponse({ error: error });
      return;
    }
    var self = this;
    window.parent.asyncStorage.getItem('checkpassword.enabletime', function(value) {
      if (value) {
        var currentTime = (new Date()).getTime();
        if (currentTime < value) {
          retryFailsHint(value);
          return;
        }
      }

      _showLoading();
      FxModuleServerRequest.changePassword(
        self.fxaPwInput.value, self.fxaNewPwInput.value,
        () => {
          accountUtils.debug('--> after changePassword(): onServerResponse(): response = ');
          NavigationMap.currentActivatedLength = 0;
          _hideLoading();
          _rightPasswordRetryRest();
          window.parent.FxAccountsUI.done({ success: true });
        },
        (response) => {
          accountUtils.debug('--> after changePassword(): onError(): response = ');
          NavigationMap.currentActivatedLength = 0;
          _hideLoading();
          self.showErrorResponse(response);
          if ('WRONG_USER_IDENTITY' == (response && response.error)) {
            _wrongPaswordRetry();
          }
        });
    });
  };

  Module.onBack = function onBack() {
  };

  Module.onDone = function onDone() {
  };
  return Module;
} ());
