
define(['require','modules/settings_panel'],function(require) { // eslint-disable-line


  const SettingsPanel = require('modules/settings_panel');

  return function createDoNotTrackPanel() {
    const DO_NOT_TRACK_KEY = 'privacy.donottrackheader.enabled';
    let elements = null;
    let listElements = null;

    function initSoftKey() {
      const params = {
        menuClassName: 'menu-button',
        header: { l10nId: 'message' },
        items: [
          {
            name: 'Save',
            l10nId: 'save',
            priority: 2,
            method() {
              const focusElement = elements.currentPanel.querySelector(
                'li.focus'
              );
              const input = focusElement.querySelector('input');
              const value = input.value === 'true';
              updateRadioButtons(value);
              const cSet = {};
              cSet[DO_NOT_TRACK_KEY] = value;
              SettingsDBCache.saveSettings(cSet);
              NavigationMap.navigateBack();
            }
          }
        ]
      };
      SettingsSoftkey.init(params);
    }

    function updateRadioButtons(value) {
      elements.doNotTrack.querySelector('input').checked = value;
      elements.track.querySelector('input').checked = !value;
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          currentPanel: panel,
          doNotTrack: panel.querySelector('.doNotTrack-setting-DoNotTrack'),
          track: panel.querySelector('.doNotTrack-setting-Track')
        };
        listElements = panel.querySelectorAll('li');
        initSoftKey();
      },
      onBeforeShow(panel, options) {
        ListFocusHelper.updateSoftkey(panel);

        SettingsDBCache.getSetting(DO_NOT_TRACK_KEY).then(value => {
          updateRadioButtons(value);
          if (!options.visibilityChange) {
            ListFocusHelper.requestFocus(
              panel,
              value ? elements.doNotTrack : elements.track
            );
          }
        });
        ListFocusHelper.addEventListener(listElements);
      },
      onBeforeHide() {
        ListFocusHelper.removeEventListener(listElements);
      }
    });
  };
});
