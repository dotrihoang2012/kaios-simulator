
define(['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createSimpinDescriptionPanel() {
    const softKeyParams = {
      menuClassName: 'menu-button',
      header: {
        l10nId: 'message'
      },
      items: [
        {
          name: 'Ok',
          l10nId: 'ok',
          priority: 2
        }
      ]
    };

    function handleEvent(evt) {
      if (evt.key === 'Enter') {
        evt.stopPropagation();
        NavigationMap.navigateBack();
      }
    }

    return SettingsPanel({
      onBeforeShow() {
        SettingsSoftkey.init(softKeyParams);
        SettingsSoftkey.show();
        window.addEventListener('keydown', handleEvent);
      },

      onBeforeHide() {
        SettingsSoftkey.hide();
        window.removeEventListener('keydown', handleEvent);
      }
    });
  };
});
