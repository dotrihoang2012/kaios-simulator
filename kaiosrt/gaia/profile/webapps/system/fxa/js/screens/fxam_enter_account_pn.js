/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global $, FxaModuleStates, FxaModule, FxModuleServerRequest, FxaModuleOverlay,
    FxaModuleManager, ViewManager, createRegionSelect, loadPhoneUtils,
    _getInternationalPhoneNumber, _loadPhoneNumber, _passwdPolicyCheck, _showConfirmation */
/* exported FxaModuleEnterAccountPN */

'use strict';

/**
 * This module checks the validity of an email address, and if valid,
 * determines which screen to go next.
 */

  /* eslint-disable-next-line no-unused-vars */
var FxaModuleEnterAccountPN = (function() {
  var loading;
  var region = { l10nId: 'fxa-cc-unitedstates', value: '+1'};

  function _showLoading() {
    loading = true;
    FxaModuleOverlay.show('fxa-connecting');
    $('fxa-enter-account-pn').dataset.subid = 'loading';
    ViewManager.setSkMenu();
  }

  function _hideLoading() {
    loading = false;
    FxaModuleOverlay.hide();
    $('fxa-enter-account-pn').dataset.subid = '';
    ViewManager.setSkMenu();
  }

  function _cleanForm(passwordEl, passwordCheck) {
    passwordEl.value = '';
    passwordCheck.value = '';
  }

  function _checkPassword(passwordEl, passwordCheck) {
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

    return '';
  }

  function _onShowPwClick(checkEl, passwordEl, confirmPasswordEl) {
    if (checkEl.checked) {
      passwordEl.type = 'text';
      confirmPasswordEl.type = 'text';
    } else {
      passwordEl.type = 'password';
      confirmPasswordEl.type = 'password';
    }
  }

  function _showRegion(ccSelected) {
    var _ = window.api.l10n.get;
    ccSelected.textContent = _(region.l10nId) + ' ' + region.value;

    ViewManager.setSkMenu();
  }

  var Module = Object.create(FxaModule);
  Module.init = function init() {
    // Cache static HTML elements
    this.importElements(
      'fxa-cc-select',
      'fxa-cc-selected',
      'fxa-account-phone-number-input',
      'fxa-pw-input',
      'fxa-confirm-pw-input',
      'fxa-show-pw'
    );

    if (this.initialized) {
      return;
    }

    // Add listeners
    this.fxaCcSelect.addEventListener(
      'change', (event) => {
        region.l10nId = event.detail.l10nId;
        region.value = event.detail.value;
        _showRegion(this.fxaCcSelected);
      }
    );

    createRegionSelect(_loadPhoneNumber(), (aRegion) => {
      region = aRegion;
      this.fxaAccountPhoneNumberInput.value = aRegion.nationalNumber;
      _showRegion(this.fxaCcSelected);
    });

    this.fxaShowPw.addEventListener('click', (event) => {
      _onShowPwClick(event.target, this.fxaPwInput,
        this.fxaConfirmPwInput);
    });

    _cleanForm(this.fxaPwInput, this.fxaConfirmPwInput);

    // Avoid to add listener twice
    this.initialized = true;
  };

  Module.onNext = function onNext(gotoNextStepCallback) {
    if (loading) return;

    var cc = this.fxaCcSelect.value;
    var number = this.fxaAccountPhoneNumberInput.value;

    if (!number) {
      this.showErrorResponse({ error: "PHONE_EMPTY" });
      return;
    }

    var internationalPhoneNumber = _getInternationalPhoneNumber(number, cc);

    loadPhoneUtils(internationalPhoneNumber).then(phone => {
      if (!phone) {
        this.showErrorResponse({
          error: "INVALID_PHONE_NUMBER"
        });
        return;
      }
      var error = _checkPassword(this.fxaPwInput, this.fxaConfirmPwInput);
      if (error) {
        this.showErrorResponse({
          error: error
        });
        return;
      }

      FxaModuleManager.setParam('phone', internationalPhoneNumber);

      _showLoading();
      // Give a to bypass empty check.
      FxModuleServerRequest.checkPhoneExistence(internationalPhoneNumber,
        response => {
          if (response && response.registered) {
            _hideLoading();
            this.showErrorResponse({ error: 'PHONE_NUMBER_IS_TAKEN' });
          } else {
            _hideLoading();
            FxaModuleManager.setParam('newPhone', true);
            FxaModuleManager.setParam('password', this.fxaPwInput.value);
            gotoNextStepCallback(FxaModuleStates.ENTER_PERSONAL_INFO);
          }
        }, response => {
          _hideLoading();
          this.showErrorResponse(response);
        }
      );
      });
  };

  Module.onBack = function onBack() {
    if (loading) {
      return _hideLoading();
    }
    if (this.confirmationShown) {
      this.confirmationShown = false;
      return;
    }
    _showConfirmation(null, () => {
      window.parent.FxAccountsUI.done(FxaModuleStates.DONE);
    });
    this.confirmationShown = true;
  };

  Module.onDone = function onDone() {
    _hideLoading();
  };
  return Module;
}());
