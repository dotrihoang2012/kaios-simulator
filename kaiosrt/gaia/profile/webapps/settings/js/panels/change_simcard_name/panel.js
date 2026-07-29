/* global SimCardHelper */

define(['require','modules/settings_panel'],function (require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createChangeCardNamePanel() {
    let serviceId = 0;
    let mobileConnection = null;
    let elements = null;
    const softKeyParams = {
      items: [
        {
          name: 'Cancel',
          l10nId: 'cancel',
          priority: 1,
          method() {
            Settings.setCurrentPanel('simcard_name', { serviceId });
          }
        },
        {
          name: 'Save',
          l10nId: 'save',
          priority: 3,
          method: saveAndBack
        }
      ]
    };

    function saveAndBack() {
      let nameEntered = elements.nameInput.value;
      nameEntered = nameEntered.replace(/^\s+|\s+$/g, '');
      let values = {};

      SettingsDBCache.getSetting('custom.simcards.name').then(value => {
        const { iccId } = mobileConnection;
        values = value || {};
        if (nameEntered) {
          values[iccId] = nameEntered;
          SettingsDBCache.saveSettings({
            'custom.simcards.name': values
          });
          Settings.setCurrentPanel('simcard_name', { serviceId });
        } else {
          delete values[iccId];
          SettingsDBCache.saveSettings({
            'custom.simcards.name': values
          });
          Settings.setCurrentPanel('simcard_name', { serviceId });
        }
      });
    }

    function handleEvent(evt) {
      if (evt.key === 'Enter') {
        evt.stopPropagation();
        elements.nameInput.focus();
      }
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          nameInput: panel.querySelector('input')
        };
      },

      onBeforeShow(panel, options) {
        serviceId = options.serviceId || serviceId;
        mobileConnection = ApiManager.connections[serviceId];
        SettingsSoftkey.init(softKeyParams);
        SettingsSoftkey.show();
        SimCardHelper.getOperatorName(mobileConnection).then(value => {
          elements.nameInput.value = value.toString();
          const cursorPos = elements.nameInput.value.length;
          elements.nameInput.setSelectionRange(cursorPos, cursorPos);
        });
        elements.nameInput.addEventListener('keydown', handleEvent);
      },

      onShow() {
        elements.nameInput.focus();
      },

      onBeforeHide() {
        elements.nameInput.removeEventListener('keydown', handleEvent);
      }
    });
  };
});
