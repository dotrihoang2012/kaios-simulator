/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global $, FxaModule, FxModuleServerRequest, FxaModuleOverlay, FxaModuleManager,
     ViewManager, accountUtils, _checkEmail */
/* exported FxaModuleEditAccountEmail */

'use strict';

/**
 * This module checks the validity of an email address, and if valid,
 * determines which screen to go next.
 */

 /* eslint-disable-next-line no-unused-vars */
var FxaModuleEditAccountEmail = (function () {
  var orgEmail;
  var subid = '';

  function _showLoading() {
    FxaModuleOverlay.show('fxa-update-account');
    $('fxa-edit-account-email').dataset.subid = 'loading';
    ViewManager.setSkMenu();
  }

  function _hideLoading() {
    $('fxa-edit-account-email').dataset.subid = subid;
    ViewManager.setSkMenu();
    FxaModuleOverlay.hide();
  }

  function _showSave(email) {
    if (email && email !== orgEmail && _checkEmail(email)) {
      subid = 'next';
      $('fxa-edit-account-email').dataset.subid = 'next';
    } else {
      subid = ''
      $('fxa-edit-account-email').dataset.subid = '';
    }

    ViewManager.setSkMenu();
  }

  var Module = Object.create(FxaModule);
  Module.init = function init(options) {
    this.options = options || {};
    // Cache static HTML elements
    this.importElements(
      'fxa-edit-email-input'
    );

    orgEmail = options.email;

    if (this.initialized) {
      return;
    }

    this.fxaEditEmailInput.addEventListener('input', (event) => {
      _showSave(event.target.value);
    });

    this.initialized = true;
  };

  Module.onNext = function onNext() {
    if (!this.fxaEditEmailInput.value) {
      this.showErrorResponse({ error: "EMAIL_EMPTY" });
      return;
    }
    if (!_checkEmail(this.fxaEditEmailInput.value)) {
      this.showErrorResponse({ error: "INVALID_EMAIL" });
      return;
    }
    _showLoading();

    // phone, email, password, info, successCb, errorCb
    FxModuleServerRequest.updateAccount('',
      this.fxaEditEmailInput.value,
      FxaModuleManager.paramsRetrieved.password,
      '',
      response => {
        accountUtils.debug(response);
        accountUtils.debug('updateAccount success');
        _hideLoading();
        FxModuleServerRequest.requestEmailVerification(this.fxaEditEmailInput.value,
          this.options.uid,
          (response) => {
            FxaModuleManager.setParam('email', this.fxaEditEmailInput.value);
            FxaModuleManager.setParam('success', true);
            FxaModuleManager.setParam('password', null);
            accountUtils.debug(response);
            accountUtils.debug('account success requestEmailVerification');
            window.parent.FxAccountsUI.done(FxaModuleManager.paramsRetrieved);
          }, (error) => {
            accountUtils.debug('account fail requestEmailVerification');
            accountUtils.debug(error);
            var text = window.api.l10n.get('email-sent-failed', {
              email: this.fxaEditEmailInput.value
            });
            window.parent.Service.request('SystemToaster:show',
                {text: text});
            FxaModuleManager.setParam('email', this.fxaEditEmailInput.value);
            FxaModuleManager.setParam('success', false);
            FxaModuleManager.setParam('password', null);
            window.parent.FxAccountsUI.done(FxaModuleManager.paramsRetrieved);
          }
        );
      }, response => {
        _hideLoading();
        accountUtils.debug(response);
        accountUtils.debug('updateAccount fail');
        this.showErrorResponse(response);
      }
    );
  };

  Module.onBack = function onBack() {
    _hideLoading();
  };

  Module.onDone = function onDone() {
    _hideLoading();
  };
  return Module;
} ());
