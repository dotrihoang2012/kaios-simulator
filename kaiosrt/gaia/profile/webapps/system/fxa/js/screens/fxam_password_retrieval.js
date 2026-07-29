/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global $, FxaModuleStates, FxaModule, FxModuleServerRequest, FxaModuleOverlay,
     FxaModuleManager, ViewManager, accountUtils, createRegionSelect, loadPhoneUtils,
     _getInternationalPhoneNumber, _isEmailValid, _showConfirmation ,FxaModuleNavigation */
/* exported FxaModulePasswordRetrieval */

'use strict';

/**
 * This module checks the validity of an email address, and if valid,
 * determines which screen to go next.
 */

  /* eslint-disable-next-line no-unused-vars */
var FxaModulePasswordRetrieval = (function() {
  var loading;
  var region = { l10nId: 'fxa-cc-unitedstates', value: '+1'};

  function _showLoading() {
    loading = true;
    FxaModuleOverlay.show('fxa-connecting');
    $('fxa-password-retrieval').dataset.subid = 'loading';
    ViewManager.setSkMenu();
  }

  function _hideLoading() {
    loading = false;
    FxaModuleOverlay.hide();
    $('fxa-password-retrieval').dataset.subid = '';
    ViewManager.setSkMenu();
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
      'fxa-alt-cc-select',
      'fxa-alt-cc-selected',
      'fxa-alt-phone-number-input',
      'fxa-email-input'
    );

    this.canceled = false;

    if (this.initialized) {
      return;
    }

    createRegionSelect('', () => {
      _showRegion(this.fxaAltCcSelected);
    });

    // Add listeners
    this.fxaAltCcSelect.addEventListener(
      'change', (event) => {
        region.l10nId = event.detail.l10nId;
        region.value = event.detail.value;
        _showRegion(this.fxaAltCcSelected)
      }
    );

    // Avoid to add listener twice
    this.initialized = true;
  };

  Module.validate = function() {
    return Promise.all([this.checkEmail(), this.checkAltPhone()]).then(results => {
      var r = results[0];
      var r1 = results[1];
      if (r === 'nil' && r1 === 'nil') {
        return Promise.reject("EMAIL_OR_ALT_PHONE_IS_REQUIRED");
      }
      if (r.error || r1.error) {
        return Promise.reject(r.error || r1.error);
      }
      if (r === true || r1 === true) {
        // Which ever is valid is good to go
        return Promise.resolve(true);
      }
    })
  };

  Module.checkAltPhone = function() {
    return new Promise((resolve) => {
      var cc = this.fxaAltCcSelect.value;
      var number = this.fxaAltPhoneNumberInput.value;
      if (!number) {
        return resolve('nil');
      }

      var internationalPhoneNumber = _getInternationalPhoneNumber(number, cc);
      loadPhoneUtils(internationalPhoneNumber).then((phone) => {
        if (phone) {
          // Altphone can not be same as primary phone
          if (FxaModuleManager.paramsRetrieved.phone === internationalPhoneNumber) {
            return resolve({
              error: "DUPLICATED_PHONE_VALUE"
            });
          }
          FxaModuleManager.setParam('altPhone', internationalPhoneNumber);
          return resolve(true);
        } else {
          return resolve({
            error: "INVALID_PHONE_NUMBER"
          });
        }
      })
    });
  };

  Module.checkEmail = function() {
    return new Promise((resolve) => {
      if (!this.fxaEmailInput.value) {
        return resolve('nil');
      }

      if (this.fxaEmailInput.value && !_isEmailValid(this.fxaEmailInput)) {
        return resolve({
          error: "INVALID_EMAIL"
        });
      }

      FxModuleServerRequest.checkEmailExistence(this.fxaEmailInput.value, response => {
        accountUtils.debug(response);
        accountUtils.debug('checkEmailExistence');
        if (response && response.registered) {
          resolve({
            error: 'EMAIL_IS_TAKEN_CREATION'
          });
        } else {
          FxaModuleManager.setParam('email', this.fxaEmailInput.value);
          resolve(true);
        }
      }, e => {
        accountUtils.debug(e);
        resolve(e);
      });
    });
  };

  Module.onNext = function onNext(gotoNextStepCallback) {
    if (loading) return;
    _showLoading();

    this.validate().then(() => {
      if (this.canceled) {
        return;
      }
      var data = FxaModuleManager.paramsRetrieved;
      var info = {
        yob: Number(FxaModuleManager.paramsRetrieved.yob),
        gender: FxaModuleManager.paramsRetrieved.gender.toLowerCase(),
        altPhone: data.altPhone
      };
      FxModuleServerRequest.signUp(data.phone,
        data.email,
        data.password,
        info,
        (response) => {
          if (this.canceled) {
            return;
          }

          if (!response || (response && !response.uid)) {
            _hideLoading();
            this.showErrorResponse({
              error: 'error'
            });

            return;
          }
          FxaModuleManager.setParam('uid', response.uid);
          accountUtils.debug('account success singUp');
          FxModuleServerRequest.requestPhoneVerification(data.phone, response.uid,
            (response) => {
              if (this.canceled) {
                return;
              }
              if (!response || (response && !response.verificationId)) {
                _hideLoading();
                this.showErrorResponse({
                  error: 'error'
                });
                return;
              }
              FxaModuleManager.setParam('verificationId', response.verificationId);
              gotoNextStepCallback(FxaModuleStates.ENTER_PHONE_OTP);
              _hideLoading();
              accountUtils.debug('account success requestPhoneVerification');
            }, (error) => {
              accountUtils.debug('account fail requestPhoneVerification');
              accountUtils.debug(error);
              _hideLoading();
              this.showErrorResponse(error);
            });
        }, (error) => {
          if (this.canceled) {
            return;
          }
          accountUtils.debug('account error singUp');
          accountUtils.debug(error);
          _hideLoading();
          this.showErrorResponse(error);
        });
    }, (error) => {
      if (this.canceled) {
        return;
      }
      _hideLoading();
      this.showErrorResponse({
        error: error
      });
    });
  };

  Module.onBack = function onBack() {
    // Normal back
    if (!loading) {
      return;
    }

    if (this.confirmationShown) {
      this.confirmationShown = false;
      return;
    }
    // When we have server API called and no response yet, we ask confirmation
    _showConfirmation(null, () => {
      // All the requests is done, do nothing.
      if (!loading) {
        return;
      }
      _hideLoading();
      this.canceled = true;
      // Based on current UX
      FxaModuleNavigation.goBack(2);
    })
    this.confirmationShown = true;
  };

  Module.onDone = function onDone() {
    _hideLoading();
  };
  return Module;
}());
