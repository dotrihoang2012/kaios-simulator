
define(['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');
  return function createManageTonesPanel() {
    let currentPanel = null;
    function handleKeyDown(e) {
      switch (e.key) {
        case 'Enter':
          {
            const focusedElement = currentPanel.querySelector('.focus');
            if (
              focusedElement.id === 'system-ringtones' ||
              focusedElement.id === 'system-alerts' ||
              focusedElement.id === 'my-ringtones'
            ) {
              const toneType = focusedElement.children[0].getAttribute(
                'data-type'
              );
              ActivityHelper.start({
                name: 'configure',
                data: {
                  target: 'ringtone',
                  toneType
                }
              });
            }
          }
          break;
        default:
          break;
      }
    }

    return SettingsPanel({
      onInit(panel) {
        currentPanel = panel;
        DeviceFeature.ready(() => {
          if (DeviceFeature.getValue('lowMemory') === 'true') {
            const el = panel.querySelector('#my-ringtones');
            el.classList.add('hidden');
          }
        });
      },
      onBeforeShow: function onBeforeShow() {
        SettingsSoftkey.init(SoftParams.defaultSelect);
        SettingsSoftkey.show();
        window.addEventListener('keydown', handleKeyDown);
      },
      onBeforeHide: function onBeforeHide() {
        SettingsSoftkey.hide();
        window.removeEventListener('keydown', handleKeyDown);
      }
    });
  };
});
