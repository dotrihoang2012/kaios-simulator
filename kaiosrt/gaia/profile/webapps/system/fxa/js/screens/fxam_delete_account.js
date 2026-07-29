/* global $, FxaModule, FxaModuleOverlay, ViewManager, FxModuleServerRequest,  accountUtils*/
/* exported FxaModuleDeleteAccount */

'use strict';

/* eslint-disable-next-line no-unused-vars */
var FxaModuleDeleteAccount = (function() {
  function _showLoading() {
    FxaModuleOverlay.show('fxa-deleting');
    $('fxa-delete-account').dataset.subid = 'loading';
    ViewManager.setSkMenu();
  }

  function _hideLoading() {
    $('fxa-delete-account').dataset.subid = '';
    ViewManager.setSkMenu();
    FxaModuleOverlay.hide();
  }

  var Module = Object.create(FxaModule);
  Module.init = function init() {
  };

  Module.onNext = function onNext() {
    _showLoading();
    var deleteAccount = function () {
      FxModuleServerRequest.deleteAccount(
        response => {
          // Log out automatically.
          accountUtils.debug('deleteAccount success');
          accountUtils.debug(response);
          FxModuleServerRequest.logout();
           _hideLoading();
          // if sucess show
          window.parent.FxAccountsUI.done({
            success: true
          });
        }, response => {
          accountUtils.debug('deleteAccount fail');
          accountUtils.debug(response);
           _hideLoading();
          this.showErrorResponse(response);
        }
      );
    }
    window.parent.FMDManager.removeSubscription().then(() => {
      deleteAccount();
    },() => {
      deleteAccount();
    });
  };

  Module.onBack = function onBack() {
    _hideLoading();
  };

  Module.onDone = function onDone() {
    _hideLoading();
  };

  return Module;

}());
