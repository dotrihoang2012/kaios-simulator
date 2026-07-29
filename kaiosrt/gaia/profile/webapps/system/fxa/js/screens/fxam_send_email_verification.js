/* global FxaModule, FxModuleServerRequest, accountUtils, _checkEmail, FxaModuleNavigation*/
'use strict';

/**
 * Send the verification mail
 */

 /* eslint-disable-next-line no-unused-vars */
var FxaModuleSendEmailVerification = (function() {
  var Module = Object.create(FxaModule);
  Module.init = function init(options) {
    this.options = options || {};
    this.sending = false;
  };

  Module.onNext = function onNext() {
    if (!_checkEmail(this.options.email)) {
      this.showErrorResponse({ error: "INVALID_EMAIL" });
      return;
    }

    if (this.sending) {
      return;
    }

    this.sending = true;
    FxModuleServerRequest.requestEmailVerification(this.options.email,
      this.options.uid,
      (response) => {
        this.sending = false;
        accountUtils.debug(response);
        accountUtils.debug('account success requestEmailVerification');
        window.parent.Service.request('SystemToaster:show',
                        {textL10n:'fxa-verify-email-sent'});
        this.emailSent = true;
        var steps = 1;
        if (this.options.isEmailForgot) {
          // Skip forgot passowrd Page
          // Avoid loop in UI
          steps = 2;
        }
        FxaModuleNavigation.goBack(steps);
      }, (error) => {
        this.sending = false;
        accountUtils.debug('account fail requestEmailVerification');
        accountUtils.debug(error);
        this.showErrorResponse(error);
      }
    );
  };

  Module.onBack = function onBack() {
    if (!this.emailSent) {
      window.parent.Service.request('SystemToaster:show',
                    {textL10n:'fxa-verify-email-signIn'});
    }

    if (this.options.isEmailForgot) {
      // Skip forgot passowrd Page
      // To avoid loop
      FxaModuleNavigation.goBack(1);
    }
  };

  return Module;

}());
