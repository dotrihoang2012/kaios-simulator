/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* global Service */
'use strict';

(function(exports) {

  /**
   * @class FxAccountsDialog
   * @param {options} object for attributes `onShow`, `onHide` callback.
   * @extends SystemDialog
   */
  var FxAccountsDialog = function FxAccountsDialog(options) {
    if (options) {
      this.options = options;
    }
    /**
     * render the dialog
     */
    this.render();
    this.publish('created');
  };

  FxAccountsDialog.prototype = Object.create(window.SystemDialog.prototype);

  FxAccountsDialog.prototype.customID = 'fxa-dialog';

  FxAccountsDialog.prototype.DEBUG = false;

  FxAccountsDialog.prototype.REGISTERED_EVENTS = ['metachange'];

  FxAccountsDialog.prototype.view = function fxad_view() {
    return `<div id="${this.instanceID}" role="dialog"
           class="generic-dialog" data-z-index-level="system-dialog"
           hidden></div>`;
  };

  FxAccountsDialog.prototype.getView = function fxad_view() {
    return document.getElementById(this.instanceID);
  };

  // Get all elements when inited.
  FxAccountsDialog.prototype._fetchElements =
    function fxad__fetchElements() {

  };

  // Register events when all elements are got.
  FxAccountsDialog.prototype._registerEvents =
    function fxad__registerEvents() {
      if (this.element === null) {
        return;
      }
      this.REGISTERED_EVENTS.forEach(function iterator(evt) {
        this.element.addEventListener(evt, this);
      }, this);
    };

  FxAccountsDialog.prototype._unregisterEvents =
    function fxad__unregisterEvents() {
      if (this.element === null) {
        return;
      }
      this.REGISTERED_EVENTS.forEach(function iterator(evt) {
        this.element.removeEventListener(evt, this);
      }, this);
    };

  FxAccountsDialog.prototype.handleEvent = function fxad__handleEvent(evt) {
    if (this['_handle_' + evt.type]) {
      this['_handle_' + evt.type](evt);
    }
  };

  FxAccountsDialog.prototype._handle_metachange =
    function fxad__handle_metachange(evt) {
      if (evt.detail.name === 'og:kaios:softkeyinfo') {
        this.setSoftKeys(evt.detail.content);
      }
    };

  FxAccountsDialog.prototype.setSoftKeys = function fxad__setSoftKeys(info) {
    this.softkeys = info;
    if (Service.query('getTopMostUI').states.activeDialog === this) {
      Service.request('currentSoftKeyUpdate');
    }
  };

  FxAccountsDialog.prototype.getSoftkeys = function fxad__getSoftkeys() {
    return this.softkeys;
  };

  exports.FxAccountsDialog = FxAccountsDialog;

}(window));
