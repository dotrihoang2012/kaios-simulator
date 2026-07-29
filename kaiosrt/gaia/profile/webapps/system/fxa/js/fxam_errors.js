/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';
/* global BrowserFrame */

(function (exports) {
  var Errors = {
    CONNECTION_ERROR: {
      title: 'fxa-connection-error-title',
      message: 'fxa-connection-error-message'
    },
    RESET_PASSWORD_ERROR: {
      title: 'fxa-reset-password-error-title',
      message: 'fxa-reset-password-error-message'
    },
    INVALID_EMAIL: {
      title: 'fxa-invalid-email-title',
      message: 'fxa-invalid-email-message'
    },
    INVALID_PASSWORD: {
      title: 'fxa-invalid-password-title',
      message: 'fxa-invalid-password-message-1'
    },
    PASSWORD_DONT_MATCH: {
      title: 'fxa-password-dont-match',
      message: 'fxa-password-dont-match-message'
    },
    ACCOUNT_DOES_NOT_EXIST: {
      title: 'fxa-account-does-not-exist',
      message: 'fxa-account-does-not-exist-message-1'
    },
    ACCOUNT_NOT_FOUND: {
      title: 'fxa-account-does-not-exist',
      message: 'fxa-account-not-found'
    },
    OFFLINE: {
      title: 'fxa-offline-error-title',
      message: 'fxa-offline-error-message-1'
    },
    UNKNOWN: {
      title: 'fxa-unknown-error-title',
      message: 'fxa-unknown-error-message'
    },
    EMAIL_IS_TAKEN: {
      title: 'fxa-email-is-taken-title',
      message: 'fxa-email-is-taken-message'
    },
    EMAIL_IS_TAKEN_CREATION: {
      title: 'fxa-email-is-taken-title',
      message: 'fxa-email-taken-1'
    },
    CONFIRM_AGE: {
      title: 'fxa-confirm-age-title',
      message: 'fxa-confirm-age-message2'
    },
    CONFIRM_GENDER: {
      title: 'fxa-error',
      message: 'fxa-confirm-gender-message'
    },
    CONFIRM_TERMS_AGREED: {
      title: 'fxa-error',
      message: 'terms-service-needed'
    },
    SIGNOUT_EORROR : {
      title: 'fxa-sign-out-error-title',
      message: 'fxa-sign-out-error-message-1'
    },
    CONNECTION_IS_REQUIRED : {
      title: 'fxa-connection-is-required-title',
      message: 'fxa-offline-error-message-1'
    },
    PASSWORD_LESS : {
      title: 'fxa-password-less',
      message: 'fxa-password-less-message-2'
    },
    PASSWORD_MORE : {
      title: 'fxa-password-more',
      message: 'fxa-password-more-message-2'
    },
    PASSWORD_ERROR : {
      title: 'fxa-password-error',
      message: 'fxa-password-error-message'
    },
    SERVER_ERROR : {
      title: 'fxa-server-error-2',
      message: 'fxa-server-error-message-2'
    },
    INVALID_PHONE_NUMBER : {
      title: 'fxa-error',
      message: 'fxa-phone-number-invalid'
    },
    PHONE_NUMBER_IS_TAKEN : {
      title: 'fxa-error',
      message: 'fxa-phone-number-is-taken'
    },
    EMAIL_OR_ALT_PHONE_IS_REQUIRED: {
      title: 'fxa-error',
      message: 'fxa-email-or-alt-phone'
    },
    NO_RETRIEVALE_METHOD : {
      title: 'fxa-error',
      message: 'fxa-no-retrieval-method'
    },
    INVALID_VERIFICATION_CODE : {
      title: 'fxa-error',
      message: 'fxa-verification-failed'
    },
    EMPTY_BIRTH_YEAR: {
      title: 'fxa-error',
      message: 'fxa-birthday-empty'
    },
    PASSWORD_OLD_NEW_SAME: {
      title: 'fxa-error',
      message: 'password-old-new-same'
    },
    PASSWORD_EMPTY: {
      title: 'fxa-error',
      message: 'password-empty'
    },
    ALREADY_VERIFIED: {
      title: 'fxa-error',
      message: 'already-verified'
    },
    WRONG_BIRTHDAY_FORMAT: {
      title: "fxa-error",
      message: "wrong-birthday-format"
    },
    WRONG_EMAIL_FORMAT: {
      title: "fxa-error",
      message: "wrong-email-format"
    },
    WRONG_PHONE_FORMAT: {
      title: "fxa-error",
      message: "wrong-phone-format"
    },
    WRONG_SECOND_PHONE_FORMAT: {
      title: "fxa-error",
      message: "wrong-second-phone-format"
    },
    MISSING_AT_LEAST_ONE_CONTACT_FIELD: {
      title: "fxa-error",
      message: "missing-at-least-one-contact-field"
    },
    DUPLICATED_PHONE_VALUE: {
      title: "fxa-error",
      message: "duplicated-phone-value"
    },
    WRONG_USER_IDENTITY: {
      title: "fxa-error",
      message: "wrong-user-identity"
    },
    TOO_MANY_CONTACT_INFO_UPDATED: {
      title: "fxa-error",
      message: "too-many-contact-info-updated"
    },
    PHONE_UPDATE_LEADS_TO_INVALID_ACCOUNT: {
      title: "fxa-error",
      message: "phone-update-leads-to-invalid-account"
    },
    EMAIL_UPDATE_LEADS_TO_INVALID_ACCOUNT: {
      title: "fxa-error",
      message: "email-update-leads-to-invalid-account"
    },
    DUPLICATE_ACCOUNT_WITH_PHONE: {
      title: "fxa-error",
      message: "duplicate-account-with-phone"
    },
    DUPLICATE_ACCOUNT_WITH_EMAIL: {
      title: "fxa-error",
      message: "duplicate-account-with-email"
    },
    EMAIL_EMPTY: {
      title: "fxa-error",
      message: "email-empty"
    },
    PHONE_EMPTY: {
      title: "fxa-error",
      message: "phone-empty"
    },
    ACCOUNT_DELETED: {
      title: "fxa-error",
      message: "account-deleted"
    },
  };

  function _getError(error) {
    var l10nKeys = Errors[error] || Errors.UNKNOWN;
    return {
      title: l10nKeys.title,
      message: l10nKeys.message
    };
  }

  var FxaModuleErrors = {
    responseToParams: function fxame_responseToParams(response) {
      return response && response.error ?
        _getError(response.error) : _getError('GENERIC_ERROR');
    }
  };
  exports.FxaModuleErrors = FxaModuleErrors;
}(window));
