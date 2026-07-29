
define(['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createGeoMoreAboutPanel() {
    let moreDetailsLink = null;

    const softkeyParams = {
      menuClassName: 'menu-button',
      header: {
        l10nId: 'message'
      },
      items: [
        {
          name: 'Select',
          l10nId: 'select',
          priority: 2,
          method() {
            Settings.setCurrentPanel('geolocation_privacy');
          }
        },
        {
          name: 'Done',
          l10nId: 'done',
          priority: 3,
          method() {
            NavigationMap.navigateBack();
          }
        }
      ]
    };

    return SettingsPanel({
      onInit(panel) {
        moreDetailsLink = panel.querySelector('.link-text');

        DeviceFeature.ready(() => {
          const geoDsc = panel.querySelector('#geolcation_more_description');
          if (DeviceFeature.getValue('wifi') !== 'true') {
            geoDsc.setAttribute(
              'data-l10n-id',
              'geolocation-privacy-description-withoutwifi-1'
            );
          } else {
            geoDsc.setAttribute(
              'data-l10n-id',
              Customization.getWifiCertifiedStrId(
                'geolocation-privacy-description-1',
                'geolocation-privacy-description-1-wlan'
              )
            );
          }
        });
      },

      onBeforeShow() {
        SettingsSoftkey.init(softkeyParams);
        SettingsSoftkey.show();
        // @HACK Set default focus on the link
        moreDetailsLink.classList.add('hasfocused');
      },

      onBeforeHide() {
        SettingsSoftkey.hide();
      }
    });
  };
});
