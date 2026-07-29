'use strict';
/* global FxaModuleUI, FxaModule */
/* exported FxaModuleAboutKaiOSAccount */

/* eslint-disable-next-line no-unused-vars */
var FxaModuleAboutKaiOSAccount = (function () {

  var Module = Object.create(FxaModule);
  Module.init = function init() {

    if (this.initialized) {
      return;
    }

    // Avoid to add listener twice
    this.initialized = true;
  };

  Module.onNext = function onNext() {};

  Module.onBack = function onBack() {
    FxaModuleUI.enableNextButton();
  };

  return Module;
}());
