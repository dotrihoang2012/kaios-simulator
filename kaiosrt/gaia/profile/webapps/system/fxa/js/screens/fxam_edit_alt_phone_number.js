/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global $, FxaModule, ViewManager, FxModuleServerRequest, FxaModuleOverlay,
     accountUtils, createRegionSelect, loadPhoneUtils, _getInternationalPhoneNumber */
/* exported FxaModuleEditAccountAltPN */

'use strict';

/**
 * This module checks the validity of an email address, and if valid,
 * determines which screen to go next.
 */

 /* eslint-disable-next-line no-unused-vars */
var FxaModuleEditAccountAltPN = (function() {
  var loading;
  var region = { l10nId: 'fxa-cc-unitedstates', value: '+1'};
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

  function _showLoading() {
    FxaModuleOverlay.show('fxa-update-account');
    $('fxa-edit-account-alt-pn').dataset.subid = 'loading';
    ViewManager.setSkMenu();
  }

  function _hideLoading() {
    $('fxa-edit-account-alt-pn').dataset.subid = subid;
    ViewManager.setSkMenu();
    FxaModuleOverlay.hide();
  }

  var Module = Object.create(FxaModule);
  Module.init = function init(options) {
    this.options = options || {};
    // Cache static HTML elements
    this.importElements(
      'fxa-cc-select',
      'fxa-cc-selected',
      'fxa-account-alt-phone-number-input'
    );
    this.cancel = false;

    if (this.initialized) {
      _showRegion(this.fxaCcSelected);
      return;
    }

    // Init
    createRegionSelect("", (aRegion) => {
      region = aRegion;
      _initInputs(this.fxaCcSelected, this.fxaAccountAltPhoneNumberInput);
    });

    // Add listeners
    this.fxaCcSelect.addEventListener('change', (event) => {
      region.l10nId = event.detail.l10nId;
      region.value = event.detail.value;
      _showRegion(this.fxaCcSelected);
    });

    this.initialized = true;
  };

  Module.onNext = function onNext() {
    if (loading) return;

    var cc = this.fxaCcSelect.value;
    var number = this.fxaAccountAltPhoneNumberInput.value;
    var internationalPhoneNumber = _getInternationalPhoneNumber(number, cc);
    if (internationalPhoneNumber == '') {
      this.showErrorResponse({
        error: "INVALID_PHONE_NUMBER"
      });
      return;
    }

    loadPhoneUtils(internationalPhoneNumber).then(phone => {
      if (!phone) {
        this.showErrorResponse({
          error: "INVALID_PHONE_NUMBER"
        });
        return;
      }

      var info = {altPhone: internationalPhoneNumber};
      _showLoading();
      // phone, email, password, info, successCb, errorCb
      FxModuleServerRequest.updateAccount('',
        '',
        this.options.password,
        info,
        () => {
          _hideLoading();
          window.parent.FxAccountsUI.done({
            success: true
          });
        }, response => {
          _hideLoading();
          accountUtils.debug(response);
          accountUtils.debug('updateAccount fail');
          this.showErrorResponse(response);
        }
      );
    });
  };

  Module.onBack = function onBack() {
    this.cancel = true;
  };

  Module.onDone = function onDone() {
  };
  return Module;
}());
