/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global $, FxaModuleStates, FxaModule, FxModuleServerRequest, FxaModuleManager,
     ViewManager, FxaModuleOverlay, accountUtils */
/* exported FxaModuleEnterPersonalInfo */

'use strict';

/**
 * This module provides birthday and gender field, and if filled,
 * determines which screen to go next.
 */

  /* eslint-disable-next-line no-unused-vars */
var FxaModuleEnterPersonalInfo = (function () {
  var loading;
  var orgInfo = {yob: '', gender: ''};
  var subid = '';

  function _showLoading() {
    loading = true;
    FxaModuleOverlay.show('fxa-update-account');
    $('fxa-enter-personal-info').dataset.subid = 'loading';
    ViewManager.setSkMenu();
  }

  function _hideLoading() {
    loading = false;
    FxaModuleOverlay.hide();
    $('fxa-enter-personal-info').dataset.subid = subid;
    ViewManager.setSkMenu();
  }

  function _blocking() {
    subid = 'blocking'
    $('fxa-enter-personal-info').dataset.subid = 'blocking';
    ViewManager.setSkMenu();
  }

  function _unblocking() {
    subid = 'unblocking'
    $('fxa-enter-personal-info').dataset.subid = 'unblocking';
    ViewManager.setSkMenu();
  }

  function checkBirthday(value) {
    if (!/^\d{4}$/.test(value)) {
      return false;
    }

    var date = new Date();
    var year = date.getFullYear();
    var OLDEST = 122;
    var YOUNGEST = 16;
    if (value < year - OLDEST || value > year - YOUNGEST) {
      return false;
    }

    return true;
  }

  function getCheckedValue() {
    var value = '';
    var select = 'input[type="radio"]';
    var radios = $('fxa-enter-personal-info').querySelectorAll(select);
    for (var i = 0; i < radios.length; i++) {
      if (radios[i].checked) {
        value = radios[i].value.toLowerCase();
        break;
      }
    }

    return value;
  }

  function setChecked(value) {
    if (!value) {
      return;
    }
    var select = 'input[type="radio"]';
    var radios = $('fxa-enter-personal-info').querySelectorAll(select);
    for (var i = 0; i < radios.length; i++) {
      if (radios[i].value.toLowerCase() === value.toLowerCase()) {
        radios[i].checked = true;
        break;
      }
    }
  }

  var Module = Object.create(FxaModule);
  Module.init = function init(options) {
    accountUtils.debug('--> FxaModuleEnterAccountInfo(): init(): options = ' + options);
    // Cache static HTML elements
    this.importElements(
      'fxa-birth-year-input'
    );
    this.options = options || {};

    if (this.options.editInfo) {
      if (options.yob) {
        orgInfo.yob = options.yob;
      } else if (options.birthday) {
        var date = new Date(options.birthday);
        orgInfo.yob = date.getFullYear();
        this.options.yob = orgInfo.yob;
      }
      orgInfo.gender = options.gender;

      setChecked(options.gender);
      this.fxaBirthYearInput.value = this.options.yob

      _blocking();
    }

    if (this.initialized) {
      return;
    }

    var select = 'input[type="radio"]';
    var radios = $('fxa-enter-personal-info').querySelectorAll(select);
    radios.forEach(radio => {
      radio.addEventListener('change', this.checkChanged.bind(this));
    })
    this.fxaBirthYearInput.addEventListener('input', this.checkChanged.bind(this));

    this.initialized = true;
  };

  Module.checkChanged = function checkChanged() {
    if (!this.options.editInfo) {
      return;
    }
    if ((orgInfo.yob == this.fxaBirthYearInput.value &&
        orgInfo.gender.toLowerCase() === getCheckedValue().toLowerCase()) ||
        !checkBirthday(this.fxaBirthYearInput.value) ||
        !getCheckedValue()) {
      _blocking();
    } else {
      _unblocking();
    }
  };

  Module.onNext = function onNext(gotoNextStepCallback) {
    this.options.yob = this.fxaBirthYearInput.value;
    if (!this.options.yob) {
      this.showErrorResponse({
        error: "EMPTY_BIRTH_YEAR"
      });

      return;
    }
    if (!checkBirthday(this.options.yob)) {
      this.showErrorResponse({
        error: "CONFIRM_AGE"
      });

      return;
    }
    this.options.gender = getCheckedValue();
    if (this.options.gender === '') {
      this.showErrorResponse({
        error: "CONFIRM_GENDER"
      });

      return;
    }

    FxaModuleManager.setParam('yob', this.options.yob);
    FxaModuleManager.setParam('gender', this.options.gender);

    if (this.options.editInfo) {
      this.updateAccount();
    } else {
      gotoNextStepCallback(FxaModuleStates.PASSWORD_RETRIEVAL);
    }
  };

  Module.updateAccount = function updateAccount() {
    var info = {
      yob: Number(this.options.yob),
      gender: this.options.gender
    };
    accountUtils.debug('--> onNext(): info = ' + JSON.stringify(info));

    _showLoading();

    // phone, email, password, info, successCb, errorCb
    FxModuleServerRequest.updateAccount('', '', '', info,
      response => {
        accountUtils.debug(response);
        accountUtils.debug('updateAccount success');
        _hideLoading()
        FxaModuleManager.setParam('success', true);
        window.parent.FxAccountsUI.done(FxaModuleManager.paramsRetrieved);
      }, response => {
        _hideLoading();
        accountUtils.debug(response);
        accountUtils.debug('updateAccount fail');
        this.showErrorResponse(response);
      }
    );
  };

  Module.onBack = function onBack() {
    if (this.options.editInfo) {
      window.parent.FxAccountsUI.done();

      return;
    }
    accountUtils.debug('--> FxaModuleEnterAccountInfo(): onBack():');
    if (loading) {
      _hideLoading();
    }
  };

  Module.onDone = function onDone() {
    accountUtils.debug('--> FxaModuleEnterAccountInfo(): onDone():');
  };

  return Module;
}());
