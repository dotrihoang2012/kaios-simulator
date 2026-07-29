
define(['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createNotificationsPanel() {
    const LOCK_SCREEN_NOTIFICATION = 'lockscreen.notifications-preview.enabled';
    let elements = null;

    function lockScreenChange(settingsValue) {
      elements.showOnLockScreenContent.classList.toggle(
        'hidden',
        !settingsValue
      );
      window.dispatchEvent(new CustomEvent('refresh'));
      const { value } = elements.showOnLockScreenSelect;
      const l10nId = value === 'true' ? 'on' : 'off';
      const bodyId = `lockscreen-notifications-${l10nId}-msg`;
      showDialog(bodyId);
    }

    function showDialog(bodyId) {
      const dialogConfig = {
        title: { id: 'confirmation', args: {} },
        body: { id: bodyId, args: {} },
        accept: {
          name: 'Ok',
          l10nId: 'ok',
          priority: 2,
          callback() {
            DialogHelper.destroy();
          }
        }
      };
      DialogHelper.show(dialogConfig);
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          showOnLockScreenSelect: panel.querySelector(
            '#backscreen-notifications select'
          ),
          showOnLockScreenContent: panel.querySelector(
            '#backscreen-content-notifications-item'
          )
        };
      },

      onBeforeShow() {
        SettingsSoftkey.init(SoftParams.defaultSelect);
        SettingsSoftkey.show();
        SettingsDBCache.getSetting(LOCK_SCREEN_NOTIFICATION).then(value => {
          elements.showOnLockScreenContent.classList.toggle('hidden', !value);
          window.dispatchEvent(new CustomEvent('refresh'));
        });
        SettingsDBCache.observe(
          LOCK_SCREEN_NOTIFICATION,
          true,
          lockScreenChange,
          true
        );
      },

      onBeforeHide() {
        SettingsSoftkey.hide();
        SettingsDBCache.unobserve(LOCK_SCREEN_NOTIFICATION, lockScreenChange);
      }
    });
  };
});
