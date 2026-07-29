/* global SimCardHelper */


define(['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createSimcardNamePanel() {
    let serviceId = 0;
    let elements = null;

    return SettingsPanel({
      onInit(panel, options) {
        serviceId = options.serviceId || serviceId;
        elements = {
          header: panel.querySelector('#simcard-id'),
          name: panel.querySelector('#current-simcard-name')
        };
      },

      onBeforeShow(panel, options) {
        serviceId = options.serviceId || serviceId;
        SettingsSoftkey.init(SoftParams.defaultSelect);
        SettingsSoftkey.show();
        SimCardHelper.getOperatorName(ApiManager.connections[serviceId]).then(
          value => {
            l10n.setAttributes(elements.header, 'sim-with-index', {
              index: serviceId
            });
            l10n.setAttributes(elements.name, 'current-sim-name', {
              name: value
            });
          }
        );
      },

      onBeforeHide() {
        SettingsSoftkey.hide();
      }
    });
  };
});
