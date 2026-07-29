/* global $, FxaModule */
'use strict';

 /* eslint-disable-next-line no-unused-vars */
var FxaModuleForgotPasswordSuccess = (function() {

  var Module = Object.create(FxaModule);
  Module.init = function init(options) {
    var _ = window.api.l10n.get;
    if (options.emailVerified) {
      $('first-p').innerText = _('fxa-reset-password-succcess-content-1');
    } else {
      $('first-p').innerText = _('reset-password-unverified-email-succcess');
    }
  };

  return Module;
}());
