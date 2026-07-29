'use strict';

/* global KeyboardHelper, SettingsObserver*/

/**
 * DynamicInputRegistry takes mozChromeEvent, check it, and save/remove the
 * dynamic input definition to Settings.
 *
 * InputAppListSettings will then pick up the change in Settings and update
 * the available layouts to all apps -- we do not communicate to it directly
 * here.
 */
(function(exports) {

var DynamicInputRegistry = function() {
  this.taskQueue = null;
};

DynamicInputRegistry.prototype.SETTING_KEY = 'keyboard.dynamic-inputs';

DynamicInputRegistry.prototype.start = function() {
  this.taskQueue = Promise.resolve();

  window.addEventListener('mozChromeEvent', this);
};

DynamicInputRegistry.prototype.stop = function() {
  this.taskQueue = null;

  window.removeEventListener('mozChromeEvent', this);
};

DynamicInputRegistry.prototype.handleEvent = function(evt) {
  var detail = evt.detail;

  if (!detail.type.startsWith('inputregistry')) {
    return;
  }

  this.taskQueue = this.taskQueue.then(function() {
    return KeyboardHelper.inputAppList.getList();
  }).then(function(inputApps) {
    var inputApp = (inputApps.filter(function(app) {
      return (app.manifestUrl === detail.manifestUrl);
    }) || [])[0];

    if (!inputApp) {
      this._sendContentEvent(detail, 'App not installed');
      return;
    }

    var currentInputIds = Object.keys(inputApp.manifest.inputs);
    if (currentInputIds.indexOf(detail.inputId) !== -1 &&
        !inputApp.manifest.inputs[detail.inputId].isDynamic) {
      this._sendContentEvent(detail,
        'Can\'t mutate a statically declared input.');
      return;
    }

    return this._updateSetting(detail).then(function() {
      this._sendContentEvent(detail);
    }.bind(this), function(e) {
      console.error(e);
      this._sendContentEvent(detail, 'Error updating input.');
    }.bind(this));
  }.bind(this)).catch(function(e) { console.error(e); });
};

DynamicInputRegistry.prototype._updateSetting = function(detail) {
  // We must mutate the setting with the same lock there.
  // As much as I want to use Promise interface, chainning callbacks in
  // DOMRequest#then does not keep the lock (transaction) alive;
  // we therefore have to work with EventTarget interface directly.
  return new Promise((resolve, reject) => {
    SettingsObserver.getValue(this.SETTING_KEY).then((value) => {
      var dynamicInputs = value || {};
      switch (detail.type) {
        case 'inputregistry-add':
          if (!(detail.manifestUrl in dynamicInputs)) {
            dynamicInputs[detail.manifestUrl] = {};
          }
          dynamicInputs[detail.manifestUrl][detail.inputId] =
            detail.inputManifest;
          break;

        case 'inputregistry-remove':
          if (!(detail.manifestUrl in dynamicInputs)) {
            break;
          }
          delete dynamicInputs[detail.manifestUrl][detail.inputId];
          if (Object.keys(dynamicInputs[detail.manifestUrl]).length === 0) {
            delete dynamicInputs[detail.manifestUrl];
          }

          break;
      }

      SettingsObserver.setValue([{
        name: this.SETTING_KEY,
        value: dynamicInputs
      }]).then(resolve, function(error) { reject(error); });
    });
  });
};

DynamicInputRegistry.prototype._sendContentEvent = function(chromeDetail, err) {
  var detail = {
    type: chromeDetail.type,
    id: chromeDetail.id
  };

  if (err) {
    detail.error = err;
  }

  window.dispatchEvent(new CustomEvent('mozContentEvent', { detail: detail }));
};

exports.DynamicInputRegistry = DynamicInputRegistry;

})(window);
