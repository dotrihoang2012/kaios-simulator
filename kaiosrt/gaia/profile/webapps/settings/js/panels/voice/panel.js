
define(['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const settingsPanel = require('modules/settings_panel');

  return function createVoicePanel() {
    let elements = null;
    let listElements = null;

    const updateManageProfileUI = function updateManageProfileUI(value) {
      if (value) {
        elements.manageProfiles.classList.remove('none-select');
        elements.manageProfiles.removeAttribute('aria-disabled');
      } else {
        elements.manageProfiles.classList.add('none-select');
        elements.manageProfiles.setAttribute('aria-disabled', true);
      }
    };

    return settingsPanel({
      onInit(panel) {
        elements = {
          manageProfiles: panel.querySelector('#manage-profiles')
        };

        listElements = panel.querySelectorAll('li');
        elements.manageProfiles.onclick = evt => {
          evt.preventDefault();
          evt.stopPropagation();
          const { target } = evt;
          if (
            target.id !== 'manage-profiles' ||
            target.hasAttribute('aria-disabled')
          ) {
            return;
          }
          DebugHelper.debug('call Manage Profile');
          ActivityHelper.start({ name: 'aov_manage_profile' });
        };
      },
      onBeforeShow() {
        SettingsSoftkey.init(SoftParams.defaultSelect);
        SettingsSoftkey.show();
        SettingsDBCache.observe(
          'settings.aov.enabled',
          false,
          updateManageProfileUI
        );
        ListFocusHelper.addEventListener(listElements);
      },
      onBeforeHide() {
        SettingsDBCache.unobserve(
          'settings.aov.enabled',
          updateManageProfileUI
        );
        SettingsSoftkey.hide();
        ListFocusHelper.removeEventListener(listElements);
      }
    });
  };
});
