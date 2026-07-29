/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global $, FxaModuleStates, FxaModule, FxModuleServerRequest, FxaModuleOverlay,
     FxaModuleManager, ViewManager, accountUtils, createRegionSelect, loadPhoneUtils,
     _getInternationalPhoneNumber */
/* exported FxaModuleEditAccountPN */

'use strict';

/**
 * This module checks the validity of an email address, and if valid,
 * determines which screen to go next.
 */

  /* eslint-disable-next-line no-unused-vars */
var FxaModuleEditAccountPN = (function() {
  var loading;
  var region = { l10nId: 'fxa-cc-unitedstates', value: '+1'};
  var orgPhNumber = null;
  var subid = '';

  function _showRegion(ccSelected) {
    var _ = window.api.l10n.get;
    ccSelected.textContent = _(region.l10nId) + ' ' + region.value;

    ViewManager.setSkMenu();
  }

  function _initInputs(selected, numberInput) {
    var _ = window.api.l10n.get;

    selected.textContent = _(region.l10nId) + ' ' + region.value;
    numberInput.value = region && region.nationalNumber;
  }

  function _showSave(number, cc, orgPhNumber) {
    var internationalPhoneNumber = _getInternationalPhoneNumber(number, cc);
    if (internationalPhoneNumber != '' && internationalPhoneNumber !== orgPhNumber) {
      subid = 'next';
      $('fxa-edit-account-pn').dataset.subid = 'next';
    } else {
      subid = '';
      $('fxa-edit-account-pn').dataset.subid = '';
    }

    ViewManager.setSkMenu();
  }

  function _showLoading() {
    loading = true;
    FxaModuleOverlay.show('fxa-update-account');
    $('fxa-edit-account-pn').dataset.subid = 'loading';
    ViewManager.setSkMenu();
  }

  function _hideLoading() {
    loading = false;
    FxaModuleOverlay.hide();
    $('fxa-edit-account-pn').dataset.subid = subid;
    ViewManager.setSkMenu();
  }

  var Module = Object.create(FxaModule);
  Module.init = function init(options) {
    this.options = options || {};
    // Cache static HTML elements
    this.importElements(
      'fxa-cc-select',
      'fxa-cc-selected',
      'fxa-account-phone-number-input'
    );
    this.cancel = false;

    orgPhNumber = options && options.phone;

    if (this.initialized) {
      _showRegion(this.fxaCcSelected);
      _showSave(this.fxaAccountPhoneNumberInput.value, this.fxaCcSelect.value, orgPhNumber);

      return;
    }

    createRegionSelect(orgPhNumber, (aRegion) => {
      region = aRegion;
      _initInputs(this.fxaCcSelected, this.fxaAccountPhoneNumberInput);
    });

    // Add listeners
    this.fxaCcSelect.addEventListener('change', (event) => {
      region.l10nId = event.detail.l10nId;
      region.value = event.detail.value;
      _showRegion(this.fxaCcSelected);
      _showSave(this.fxaAccountPhoneNumberInput.value, this.fxaCcSelect.value, orgPhNumber);
    });
    this.fxaAccountPhoneNumberInput.addEventListener('input', () => {
      _showSave(this.fxaAccountPhoneNumberInput.value, this.fxaCcSelect.value, orgPhNumber);
    });

    this.initialized = true;
  };

  Module.onNext = function onNext(gotoNextStepCallback) {
    var self = this;
    if (loading) return;

    var cc = self.fxaCcSelect.value;
    var number = self.fxaAccountPhoneNumberInput.value;
    if (!number) {
      this.showErrorResponse({ error: "PHONE_EMPTY" });
      return;
    }
    var internationalPhoneNumber = _getInternationalPhoneNumber(number, cc);
    if (internationalPhoneNumber == '') {
      self.showErrorResponse({
        error: "INVALID_PHONE_NUMBER"
      });
      return;
    }

    loadPhoneUtils(internationalPhoneNumber).then(phone => {
      if (!phone) {
        self.showErrorResponse({
          error: "INVALID_PHONE_NUMBER"
        });
        return;
      }

      _showLoading();
      // phone, email, password, info, successCb, errorCb
      FxModuleServerRequest.updateAccount(internationalPhoneNumber,
        '',
        this.options.password,
        '',
        response => {
          if (this.cancel) {
            _hideLoading();
            return;
          }
          accountUtils.debug(response);
          accountUtils.debug('updateAccount success');

          FxModuleServerRequest.requestPhoneVerification(internationalPhoneNumber,
            this.options.uid,
            (response) => {
              _hideLoading();
              if (!response || (response && !response.verificationId)) {
                this.showErrorResponse({
                  error: 'error'
                });
                return;
              }
              FxaModuleManager.setParam('verificationId', response.verificationId);
              FxaModuleManager.setParam('phone', internationalPhoneNumber);
              FxaModuleManager.setParam('editPhone', true);
              gotoNextStepCallback(FxaModuleStates.ENTER_PHONE_OTP);
              accountUtils.debug('account success requestPhoneVerification');
            }, (error) => {
              accountUtils.debug('account fail requestPhoneVerification');
              accountUtils.debug(error);
              _hideLoading();
              this.showErrorResponse(error);
            });
        }, response => {
          accountUtils.debug(response);
          accountUtils.debug('updateAccount fail');
          _hideLoading();
          this.showErrorResponse(response);
        }
      );
    });
  };

  Module.onBack = function onBack() {
    this.cancel = true;
    _hideLoading();
  };

  Module.onDone = function onDone() {
    _hideLoading();
  };
  return Module;
}());
