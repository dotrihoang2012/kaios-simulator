

// eslint-disable-next-line
define(['require','modules/settings_panel','panels/input_method_config/input_method_config'],function(require) {
  const SettingsPanel = require('modules/settings_panel');
  const IMEConfig = require('panels/input_method_config/input_method_config');

  return function inputMethodConfigPanel() {
    let elements = {};
    let listElements = null;
    const IMEConfigModule = new IMEConfig();

    function updateSoftKey() {
      const params = {
        menuClassName: 'menu-button',
        header: { l10nId: 'message' },
        items: [
          {
            name: 'Select',
            l10nId: 'select',
            priority: 2
          }
        ]
      };
      SettingsSoftkey.init(params);
      SettingsSoftkey.show();
    }

    return SettingsPanel({
      onInit: function onInit(panel, options) {
        this.panel = panel;
        elements = {
          list: panel.querySelector('ul'),
          configTitle: panel.querySelector('.ime-config-title')
        };
        IMEConfigModule.init(elements, options);
      },

      onBeforeShow: function onBeforeShow(panel, options) {
        if (options.Key) {
          IMEConfigModule.showConfig(panel, options.Key);
        }
        ListFocusHelper.updateSoftkey(panel);
        listElements = panel.querySelectorAll('li');
        ListFocusHelper.addEventListener(listElements);
        updateSoftKey();
      },

      onBeforeHide: function onBeforeHide() {
        IMEConfigModule.removeKeyListener(this.panel);
        ListFocusHelper.removeEventListener(listElements);
      }
    });
  };
});
