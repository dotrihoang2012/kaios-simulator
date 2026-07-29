
define(['require','modules/settings_panel','modules/battery/battery'],function(require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');
  const Battery = require('modules/battery/battery');

  return function createBatteryPanel() {
    let elements = {};

    const refreshText = function refreshText() {
      l10n.setAttributes(
        elements.batteryLevelText,
        `batteryLevel-percent-${Battery.state}`,
        { level: Battery.level }
      );
    };

    function updateAutoSavingItem(enabled) {
      elements.autoSavingSelect.value = enabled;
    }

    function updatePowerSavingItem(enabled) {
      elements.powerSaveSelect.value = enabled;
      if (ApiManager.powerSupply.powerSupplyOnline) {
        elements.autoSavingContainer.setAttribute('aria-disabled', true);
        elements.autoSavingContainer.classList.add('none-select');
        return;
      }
      elements.autoSavingContainer.setAttribute('aria-disabled', enabled);
      if (enabled) {
        elements.autoSavingContainer.classList.add('none-select');
      } else {
        elements.autoSavingContainer.classList.remove('none-select');
      }
    }

    function updatePowerSavingMode() {
      const value = ApiManager.powerSupply.powerSupplyOnline;
      elements.powerSaveMode.setAttribute('aria-disabled', value);
      elements.autoSavingContainer.setAttribute('aria-disabled', value);
      if (value) {
        elements.powerSaveMode.classList.add('none-select');
        elements.autoSavingContainer.classList.add('none-select');
      } else {
        elements.powerSaveMode.classList.remove('none-select');
        elements.autoSavingContainer.classList.remove('none-select');
      }
      ListFocusHelper.updateSoftkey();
    }

    function updatePowerSaveInfo() {
      const isBtSupport =
        DeviceFeature.getValue('bt') === 'true' && !!ApiManager.bluetooth;
      const isGeoSupport = DeviceFeature.getValue('gps') === 'true';
      if (isBtSupport && isGeoSupport) {
        elements.powerSaveInfo.setAttribute(
          'data-l10n-id',
          'powerSave-explanation'
        );
      } else if (isBtSupport) {
        elements.powerSaveInfo.setAttribute(
          'data-l10n-id',
          'powerSave-without-geo'
        );
      } else if (isGeoSupport) {
        elements.powerSaveInfo.setAttribute(
          'data-l10n-id',
          'powerSave-without-bt'
        );
      } else {
        elements.powerSaveInfo.setAttribute(
          'data-l10n-id',
          'powerSave-without-bt-geo'
        );
      }
    }

    return SettingsPanel({
      onInit: function onInit(panel) {
        elements = {
          liElements: panel.querySelectorAll('li'),
          batteryLevelText: panel.querySelector('#battery-level'),
          autoSavingContainer: panel.querySelector('#auto-saving-container'),
          autoSavingSelect: panel.querySelector(
            '#auto-saving-container select'
          ),
          powerSaveMode: panel.querySelector('#power-save-mode'),
          powerSaveSelect: panel.querySelector('#power-save-mode select'),
          powerSaveInfo: panel.querySelector('#power-save-info')
        };
        updatePowerSaveInfo();
      },

      onBeforeShow: function onBeforeShow() {
        SettingsSoftkey.init(SoftParams.defaultSelect);
        SettingsSoftkey.show();
        refreshText();
        Battery.observe('level', refreshText);
        Battery.observe('state', refreshText);
        SettingsDBCache.observe(
          'powersave.enabled',
          false,
          updatePowerSavingItem
        );
        SettingsDBCache.observe(
          'powersave.threshold',
          false,
          updateAutoSavingItem
        );
        ListFocusHelper.addEventListener(elements.liElements);
        ApiManager.powerSupply.addEventListener(
          'powersupplystatuschanged',
          updatePowerSavingMode
        );
        updatePowerSavingMode();
      },

      onBeforeHide: function onBeforeHide() {
        Battery.unobserve(refreshText);
        SettingsDBCache.unobserve('powersave.enabled', updatePowerSavingItem);
        SettingsDBCache.unobserve('powersave.threshold', updateAutoSavingItem);
        ListFocusHelper.removeEventListener(elements.liElements);
        ApiManager.powerSupply.removeEventListener(
          'powersupplystatuschanged',
          updatePowerSavingMode
        );
        SettingsSoftkey.hide();
      }
    });
  };
});
