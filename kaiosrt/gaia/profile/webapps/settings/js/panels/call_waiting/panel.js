
define(['require','modules/settings_panel'],function(require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createCallWaitingSettingsPanel() {
    let callWaitingQueryStatus = false;
    let mobileConnection = null;
    let serviceId = 0;
    let elements = null;

    function updateCallWaitingItemState(callback) {
      if (elements.callWaitingItem.classList.contains('hidden')) {
        if (typeof callback === 'function') {
          callback(null);
        }
        return;
      }

      enableTapOnCallWaitingItem(false);

      const getCWEnabled = mobileConnection.getCallWaitingOption();
      getCWEnabled.onsuccess = () => {
        const enabled = getCWEnabled.result;
        elements.callWaitingSelect.value = enabled;
        elements.callWaitingItem.dataset.state = enabled ? 'on' : 'off';
        enableTapOnCallWaitingItem(true);

        if (callback) {
          callback(null);
        }
      };
      getCWEnabled.onerror = () => {
        elements.callWaitingItem.dataset.state = 'unknown';
        if (callback) {
          callback(null);
        }
      };
    }

    function enableCallWaitingSelect(evt) {
      evt.stopPropagation();
      if (callWaitingQueryStatus) {
        elements.callWaitingSelect.classList.remove('hidden');
        elements.callWaitingSelect.focus();
      }
      elements.callWaitingSelect.classList.add('hidden');
    }

    function handleChange(evt) {
      evt.stopPropagation();
      const handleSetCallWaiting = () => {
        updateCallWaitingItemState(() => {
          enableTapOnCallWaitingItem(true);
        });
      };
      enableTapOnCallWaitingItem(false);
      const enabled = elements.callWaitingSelect.value === 'true' || false;
      const req = mobileConnection.setCallWaitingOption(enabled);
      req.onerror = handleSetCallWaiting;
      req.onsuccess = () => {
        updateCallWaitingItemState(() => {
          enableTapOnCallWaitingItem(true);
          ToastHelper.showToast('changessaved');
        });
      };
    }

    /**
     * Enable/Disable call waiting settings page
     */
    function enableTapOnCallWaitingItem(enable) {
      const descText = elements.callWaitingItem.querySelector('small');
      // Update call waiting query status
      callWaitingQueryStatus = enable;

      // Update the description
      function getSelectValue() {
        const enabled = elements.callWaitingSelect.value === 'true';
        const status = enabled ? 'enabled' : 'disabled';
        return status;
      }

      if (descText && !enable) {
        descText.setAttribute('data-l10n-id', 'callSettingsQuery');
      } else {
        // Clear the data-l10n-id information
        descText.innerHTML = '';
        descText.setAttribute('data-l10n-id', getSelectValue());
      }

      if (enable) {
        elements.callWaitingItem.removeAttribute('aria-disabled');
        elements.callWaitingItem.classList.remove('none-select');
        SettingsSoftkey.init(SoftParams.defaultSelect);
        SettingsSoftkey.show();
      } else {
        elements.callWaitingItem.setAttribute('aria-disabled', 'true');
        elements.callWaitingItem.classList.add('none-select');
        SettingsSoftkey.hide();
      }
    }

    return SettingsPanel({
      onInit(panel, options) {
        serviceId = options.serviceId || serviceId;
        elements = {
          callWaitingItem: panel.querySelector('#call-waiting-item'),
          callWaitingSelect: panel.querySelector('#call-waiting-item select')
        };
      },

      onBeforeShow(panel, options) {
        serviceId = options.serviceId || serviceId;
        mobileConnection = ApiManager.connections[serviceId];
        elements.callWaitingItem.addEventListener(
          'click',
          enableCallWaitingSelect
        );
        elements.callWaitingSelect.addEventListener('change', handleChange);

        updateCallWaitingItemState();
      },
      onBeforeHide() {
        elements.callWaitingItem.removeEventListener(
          'click',
          enableCallWaitingSelect
        );
        elements.callWaitingSelect.removeEventListener('change', handleChange);
      }
    });
  };
});
