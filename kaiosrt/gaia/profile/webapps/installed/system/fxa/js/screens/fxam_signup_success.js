/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global FxaModule, FxaModuleStates, NavigationMap, ViewManager */
/* exported FxaModuleSignupSuccess */

'use strict';

/**
 * Display the signup success message to the user.
 */

 /* eslint-disable-next-line no-unused-vars */
var FxaModuleSignupSuccess = (function () {

  var Module = Object.create(FxaModule);
  Module.init = function init(options) {
    options = options || {};
    this.importElements(
      'fxa-will-send-email-content',
      'fxa-will-send-email-timeframe'
    );

    if (this.initialized) {
      return;
    }

    ViewManager.setSkMenu();
    var willSendText = window.api.l10n.get('fxa-signup-click-verification-link-in-email');
    willSendText = willSendText.replace(
      /{{\s*email\s*}}/,
      '<strong>' + options.email + '</strong>'
    );
    this.fxaWillSendEmailContent.innerHTML = willSendText;
    this.initialized = true;
  };

  Module.onNext = function onNext(gotoNextStepCallback) {
    NavigationMap.currentActivatedLength = 0;
    gotoNextStepCallback(FxaModuleStates.Done);
  };

  return Module;

}());
