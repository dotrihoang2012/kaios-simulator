
define(['require','modules/settings_panel'],function(require) { // eslint-disable-line

  const SettingsPanel = require('modules/settings_panel');
  return function createUmsEnabledPanel() {
    let elements = null;
    const UMS_ENABLED = 'ums.enabled';
    const TETHERING_USB_ENABLED = 'tethering.usb.enabled';
    let oldUmsValue = null;

    const softKeyParams = {
      menuClassName: 'menu-button',
      header: { l10nId: 'message' },
      items: [
        {
          name: 'Cancel',
          l10nId: 'cancel',
          priority: 1,
          method() {
            NavigationMap.navigateBack();
          }
        },
        {
          name: 'Select',
          l10nId: 'select',
          priority: 2,
          method() {
            const enabled = elements.currentPanel.querySelector('.focus input')
              .checked;
            if (enabled) {
              NavigationMap.navigateBack();
              return;
            }
            if (!oldUmsValue) {
              SettingsDBCache.getSetting(TETHERING_USB_ENABLED).then(value => {
                if (value) {
                  showIncompatibleSettingsDialog();
                } else {
                  const cSet = {};
                  cSet[UMS_ENABLED] = true;
                  SettingsDBCache.saveSettings(cSet);
                  NavigationMap.navigateBack();
                }
              });
            } else {
              const cSet = {};
              cSet[UMS_ENABLED] = false;
              SettingsDBCache.saveSettings(cSet);
              NavigationMap.navigateBack();
            }
          }
        }
      ]
    };

    function showIncompatibleSettingsDialog() {
      const headerL10n = 'is-warning-storage-header';
      const messageL10n = 'is-warning-storage-tethering-message';

      const dialogConfig = {
        title: { id: headerL10n, args: {} },
        body: { id: messageL10n, args: {} },
        cancel: {
          l10nId: 'cancel',
          priority: 1,
          callback() {
            elements.enabledInput.checked = oldUmsValue;
            elements.disabledInput.checked = !oldUmsValue;
            DialogHelper.destroy();
          }
        },
        confirm: {
          l10nId: 'enable',
          priority: 3,
          callback() {
            const cSet = {};
            cSet[UMS_ENABLED] = true;
            cSet[TETHERING_USB_ENABLED] = false;
            SettingsDBCache.saveSettings(cSet);
            DialogHelper.destroy();
            NavigationMap.navigateBack();
          }
        }
      };
      DialogHelper.show(dialogConfig);
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          currentPanel: panel,
          enabledItem: panel.querySelector('#enabledItem'),
          enabledInput: panel.querySelector('#enabledItem input'),
          disabledItem: panel.querySelector('#disabledItem'),
          disabledInput: panel.querySelector('#disabledItem input')
        };
      },

      onBeforeShow(panel, options) {
        SettingsSoftkey.init(softKeyParams);
        SettingsSoftkey.show();
        SettingsDBCache.getSetting(UMS_ENABLED).then(value => {
          oldUmsValue = value;
          elements.enabledInput.checked = value;
          elements.disabledInput.checked = !value;
          if (!options.visibilityChange) {
            ListFocusHelper.requestFocus(
              panel,
              value ? elements.enabledItem : elements.disabledItem
            );
          }
        });
      }
    });
  };
});
