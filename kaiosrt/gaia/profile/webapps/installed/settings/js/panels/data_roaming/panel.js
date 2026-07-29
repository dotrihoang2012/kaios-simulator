/* Set data roaming*/

define(['require','modules/settings_panel'],function(require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createDataRoamingPanel() {
    let currentSettingsValue = false;
    let switchOn = null;
    let switchOff = null;
    return SettingsPanel({
      onInit(panel) {
        this.elements = {
          panel,
          params: {
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
                priority: 2
              }
            ]
          }
        };
        this.initUI();
      },

      setValue(evt) {
        const enabled = evt.target.value === '1' || false;
        if (currentSettingsValue === enabled) {
          NavigationMap.navigateBack();
          return;
        }

        const option = {};
        option['ril.data.roaming_enabled'] = enabled;
        SettingsDBCache.saveSettings(option);
        Settings.setCurrentPanel('#carrier');

        switchOn.checked = enabled;
        switchOff.checked = !enabled;
        ToastHelper.showToast('changessaved');
      },

      updateInfo(enabled) {
        currentSettingsValue = enabled;
        switchOn.checked = enabled;
        switchOff.checked = !enabled;
      },

      onBeforeShow() {
        SettingsSoftkey.init(this.elements.params);
        SettingsSoftkey.show();
        switchOn.addEventListener('click', this.setValue);
        switchOff.addEventListener('click', this.setValue);
        SettingsDBCache.observe(
          'ril.data.roaming_enabled',
          false,
          this.updateInfo
        );
      },

      onShow(panel, options) {
        if (!options.visibilityChange) {
          SettingsDBCache.getSetting('ril.data.roaming_enabled').then(value => {
            const roamingEnabled = value;
            const liItem = panel.querySelectorAll('li');
            if (roamingEnabled) {
              ListFocusHelper.requestFocus(panel, liItem[0]);
            } else {
              ListFocusHelper.requestFocus(panel, liItem[1]);
            }
          });
        }
      },

      onBeforeHide() {
        switchOn.removeEventListener('click', this.setValue);
        switchOff.removeEventListener('click', this.setValue);
        SettingsDBCache.unobserve('ril.data.roaming_enabled', this.updateInfo);
      },

      initUI() {
        switchOn = this.elements.panel.querySelector("li input[value='1']");
        switchOff = this.elements.panel.querySelector("li input[value='0']");
      }
    });
  };
});
