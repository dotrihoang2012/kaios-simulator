
define('panels/developer_hud/panel',['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createDeveloperHudPanel() {
    const DEVTOOLS_OVERLAY = 'devtools.overlay';
    const HUD_APPMEMORY = 'hud.appmemory';
    let elements = null;
    let overlayEnabled = false;
    let appMemoryEnabled = false;

    function syncHudState() {
      if (!elements) return;
      [].forEach.call(elements.widgets, widget => {
        widget.classList.toggle('disabled', !overlayEnabled);
      });
      const lis = elements.widgets[0].getElementsByTagName('li');
      [].forEach.call(lis, li => {
        const isMemorySubItem = !!li.querySelector('.memory-item');
        const enabled = isMemorySubItem ? (overlayEnabled && appMemoryEnabled) : overlayEnabled;
        if (!enabled) {
          li.setAttribute('aria-disabled', true);
          li.classList.add('none-select');
        } else {
          li.removeAttribute('aria-disabled');
          li.classList.remove('none-select');
        }
        const input = li.querySelector('input');
        if (input) input.disabled = !enabled;
        const select = li.querySelector('select');
        if (select) select.disabled = !enabled;
      });
      if (window.ListFocusHelper && elements.panel) {
        ListFocusHelper.updateSoftkey(elements.panel);
      }
    }

    function handleChange(value, key) {
      if (key === DEVTOOLS_OVERLAY) {
        overlayEnabled = value === true || value === 'true';
      } else if (key === HUD_APPMEMORY) {
        appMemoryEnabled = value === true || value === 'true';
      }
      syncHudState();
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          panel,
          listElements: panel.querySelectorAll('li'),
          widgets: panel.querySelectorAll('.hud-widgets'),
          items: panel.querySelectorAll('.memory-item')
        };
      },
      onBeforeShow(panel) {
        SettingsSoftkey.init(SoftParams.defaultSelect);
        SettingsSoftkey.show();
        if (window.ListFocusHelper && elements && elements.listElements) {
          ListFocusHelper.addEventListener(elements.listElements);
          ListFocusHelper.updateSoftkey(panel);
        }
        SettingsDBCache.observe(DEVTOOLS_OVERLAY, false, handleChange);
        SettingsDBCache.observe(HUD_APPMEMORY, false, handleChange);
      },
      onBeforeHide() {
        SettingsSoftkey.hide();
        if (window.ListFocusHelper && elements && elements.listElements) {
          ListFocusHelper.removeEventListener(elements.listElements);
        }
        SettingsDBCache.unobserve(DEVTOOLS_OVERLAY, handleChange);
        SettingsDBCache.unobserve(HUD_APPMEMORY, handleChange);
      }
    });
  };
});

