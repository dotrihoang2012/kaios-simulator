/**
 * The Bluetooth panel
 *
 */
/* global  */

define(['require','modules/bluetooth/bluetooth_context','modules/settings_panel'],function(require) { //eslint-disable-line


  const BtContext = require('modules/bluetooth/bluetooth_context');
  const SettingsPanel = require('modules/settings_panel');

  const DEBUG = true;
  function debug(msg) {
    if (DEBUG) {
      console.log(`--> [Bluetooth][Panel]: ${msg}`);
    }
  }

  return function ctorBluetooth() {
    let elements = null;
    let softkeyParams = null;
    const MAX_DEVICE_NAME_LENGTH = 20;

    return SettingsPanel({
      onInit(panel) {
        debug('onInit():');

        elements = {
          panel,
          updateNameInput: panel.querySelector('#update-device-name-input')
        };
        softkeyParams = {
          items: [
            {
              name: 'Cancel',
              l10nId: 'cancel',
              priority: 1,
              method() {
                Settings.isBackHref = true;
                Settings.setCurrentPanel('bluetooth');
              }
            },
            {
              name: 'Save',
              l10nId: 'save',
              priority: 3,
              method: this.saveAndBack
            }
          ]
        };

        elements.updateNameInput.oninput = e => {
          const inputString = e.target.value;
          let params = null;
          if (inputString.length > 0) {
            params = softkeyParams;
          } else {
            params = {
              items: [
                {
                  name: 'Cancel',
                  l10nId: 'cancel',
                  priority: 1,
                  method() {
                    Settings.isBackHref = true;
                    Settings.setCurrentPanel('bluetooth');
                  }
                }
              ]
            };
          }
          SettingsSoftkey.init(params);
          SettingsSoftkey.show();
        };
      },

      onBeforeShow() {
        debug('onBeforeShow():');
        this.prepareInputField();
      },

      onShow() {
        debug('onShow():');
        SettingsSoftkey.init(softkeyParams);
        SettingsSoftkey.show();
        elements.updateNameInput.focus();
        window.addEventListener('keydown', this.handleCSK);
      },

      onBeforeHide() {
        debug('onBeforeHide():');
        window.removeEventListener('keydown', this.handleCSK);
      },

      onHide() {
        debug('onHide():');
      },

      prepareInputField() {
        elements.updateNameInput.value = BtContext.name;
        // Focus the input field to trigger showing the keyboard
        const cursorPos = elements.updateNameInput.value.length;
        elements.updateNameInput.setSelectionRange(cursorPos, cursorPos);
      },

      saveAndBack() {
        let nameEntered = elements.updateNameInput.value;
        nameEntered = nameEntered.replace(/^\s+|\s+$/gu, '');

        if (nameEntered.length > MAX_DEVICE_NAME_LENGTH) {
          const dialogConfig = {
            title: { id: 'change-device-name', args: {} },
            body: {
              id: 'bluetooth-name-maxlength-alert',
              args: { length: MAX_DEVICE_NAME_LENGTH }
            },
            accept: {
              l10nId: 'ok',
              priority: 2,
              callback() {
                // Do nothing
              }
            }
          };
          DialogHelper.show(dialogConfig);
          return;
        }
        if (nameEntered === '') {
          debug('saveAndBack(): set name by product model');
          BtContext.setNameByProductModel();
        } else {
          BtContext.setName(nameEntered).then(
            () => {
              ToastHelper.showToast('changessaved');
              Settings.isBackHref = true;
              Settings.setCurrentPanel('bluetooth');
              debug(`saveAndBack(): setName = ${nameEntered} successfully`);
            },
            reason => {
              Settings.isBackHref = true;
              Settings.setCurrentPanel('bluetooth');
              debug(
                `saveAndBack(): setName = ${nameEntered} failed, reason = ${reason}`
              );
            }
          );
        }
      },

      handleCSK(e) {
        if (e.key === 'Accept' || e.key === 'Enter') {
          elements.panel.querySelector('.focus input').focus();
        }
      }
    });
  };
});
