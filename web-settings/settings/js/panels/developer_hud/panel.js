
define('panels/developer_hud/panel',['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createDeveloperHudPanel() {
    const DEVTOOLS_OVERLAY = 'devtools.overlay';
    const HUD_APPMEMORY = 'hud.appmemory';
    let elements = null;

    function handleChange(value, key) {
      if (key === DEVTOOLS_OVERLAY) {
        [].forEach.call(elements.widgets, widget => {
          widget.classList.toggle('disabled', !value);
        });
        const lis = elements.widgets[0].getElementsByTagName('li');
        [].forEach.call(lis, li => {
          if (!value) {
            li.setAttribute('aria-disabled', true);
          } else {
            li.removeAttribute('aria-disabled');
          }
        });
        const inputs = elements.widgets[0].getElementsByTagName('input');
        [].forEach.call(inputs, input => {
          input.disabled = !value;
        });
        const selects = elements.widgets[0].getElementsByTagName('select');
        [].forEach.call(selects, select => {
          select.disabled = !value;
        });
      } else if (key === HUD_APPMEMORY) {
        [].forEach.call(elements.items, item => {
          const li = item.parentElement.parentElement;
          const input = item.parentElement.querySelector('input');
          if (!value) {
            li.setAttribute('aria-disabled', true);
            input.disabled = true;
          } else {
            li.removeAttribute('aria-disabled');
            input.disabled = false;
          }
        });
      }
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          widgets: panel.querySelectorAll('.hud-widgets'),
          items: panel.querySelectorAll('.memory-item')
        };
      },
      onBeforeShow() {
        SettingsSoftkey.init(SoftParams.defaultSelect);
        SettingsSoftkey.show();
        SettingsDBCache.observe(DEVTOOLS_OVERLAY, false, handleChange);
        SettingsDBCache.observe(HUD_APPMEMORY, false, handleChange);
      },
      onBeforeHide() {
        SettingsSoftkey.hide();
        SettingsDBCache.unobserve(DEVTOOLS_OVERLAY, handleChange);
        SettingsDBCache.unobserve(HUD_APPMEMORY, handleChange);
      }
    });
  };
});

