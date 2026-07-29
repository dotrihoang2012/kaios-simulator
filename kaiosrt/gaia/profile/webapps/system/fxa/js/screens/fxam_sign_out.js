/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global $, FxaModule, FxaModuleManager, FxModuleServerRequest, FxaModuleStates,
     FxaModuleOverlay, NavigationMap, ViewManager, retryFailsHint,
     _rightPasswordRetryRest, _wrongPaswordRetry */
/* exported FxaModuleSignOut */

'use strict';

/**
 * This module checks the validity of an email address, and if valid,
 * determines which screen to go next.
 */

  /* eslint-disable-next-line no-unused-vars */
var FxaModuleSignOut = (function () {
  function _showLoading(lanId) {
    var lmsg = 'fxa-signing-out';
    if (lanId) {
      lmsg = lanId;
    }
    FxaModuleOverlay.show(lmsg);
    $('fxa-sign-out').dataset.subid = 'loading';
    ViewManager.setSkMenu();
  }

  function _hideLoading() {
    $('fxa-sign-out').dataset.subid = '';
    ViewManager.setSkMenu();
    FxaModuleOverlay.hide();
  }

  function _SignOutWithAntitheft(model, password) {
    window.parent.asyncStorage.getItem('checkpassword.enabletime', function(value) {
      if (value) {
        var currentTime = (new Date()).getTime();
        if (currentTime < value) {
          retryFailsHint(value);
          return;
        }
      }

      _showLoading();
      FxModuleServerRequest.verifyPassword(
        password,
        function onServerResponse() {
          var logout = function () {
            NavigationMap.currentActivatedLength = 0;
            _hideLoading();
            FxModuleServerRequest.logout(function () {
              window.parent.FxAccountsUI.done({ success: true });
            }, function onError(response) {
              if (response && (response.error === 'SERVER_ERROR')) {
                window.parent.FxAccountsUI.done({ success: false });
              } else {
                model.showErrorResponse(response);
              }
            });
          };
          //We just need to remove push subscription, no matter the result.
          window.parent.FMDManager.removeSubscription().then(() => {
            logout();
          },() => {
            logout();
          });
          _rightPasswordRetryRest();
        }.bind(model),
        function onError(response) {
          NavigationMap.currentActivatedLength = 0;
          _hideLoading();
          model.showErrorResponse(response);
          if ('INVALID_PASSWORD' == (response && response.error)) {
            _wrongPaswordRetry();
          }
        }.bind(model)
      );
    });
  }

  function _SignOutWithoutAntitheft(model) {
    _showLoading();
    window.parent.FxAccountsClient.logout(function () {
      _hideLoading();
      window.parent.FxAccountsUI.done({success: true});
    }, function onError(response) {
      _hideLoading();
      if (response && (response.error === 'SERVER_ERROR')) {
        window.parent.FxAccountsUI.done({ success: false });
      } else {
        model.showErrorResponse(response);
      }
    });
  }

  var Module = Object.create(FxaModule);
  Module.init = function init(options) {
    this.options = options || { };
    _showLoading();
    // Cache static HTML elements
    this.importElements(
      'fxa-email-input',
      'fxa-pw-input',
      'fxa-show-pw'
    );

    if (this.initialized) {
      _hideLoading();
      return;
    }

    if (!window.parent.FMDManager.antitheft_enabled) {
      _SignOutWithoutAntitheft(this);
      return;
    } else {
      ViewManager.updateTitle('fxa-sign-out-title-new');
    }

    var contact = this.options.phone || this.options.email;
    this.fxaEmailInput.textContent = contact;
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
    _hideLoading();
  };

  Module.onNext = function onNext() {
    _SignOutWithAntitheft(this, this.fxaPwInput.value);
  };

  Module.onBack = function onBack(gotoBackStepCallback) {
    _showLoading('fxa-connecting');
    var contact = this.options.email || this.options.phone;
    FxModuleServerRequest.resetPasswordInit(contact,
      (methods) => {
        if (methods && Array.isArray(methods)) {
          FxaModuleManager.setParam('resetMethods', methods);
          gotoBackStepCallback(FxaModuleStates.FORGOT_PASSWORD);
        } else {
          _hideLoading();
          this.showErrorResponse({ error: 'NO_RETRIEVALE_METHOD' });
        }
      }, (e) => {
        _hideLoading();
        this.showErrorResponse(e);
      }
    );
  };
  Module.onDone = function onDone() {
    _hideLoading();
  };

  return Module;
} ());
