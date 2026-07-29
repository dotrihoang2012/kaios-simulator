
define(['require','modules/settings_panel'],function(require) { //eslint-disable-line

  const SettingsPanel = require('modules/settings_panel');

  return function createEmergencyAlertPanel() {
    const CMAS_DB_LIST = [
      'cmas.extreme.enabled',
      'cmas.severe.enabled',
      'cmas.amber.enabled',
      'cmas.safety.enabled',
      'cmas.weatest.enabled',
      'cmas.monthlytest.enabled'
    ];
    let listElements = null;
    let elements = null;

    const deselectParams = {
      menuClassName: 'menu-button',
      header: {
        l10nId: 'message'
      },
      items: [
        {
          name: 'Deselect',
          l10nId: 'deselect',
          priority: 2
        }
      ]
    };

    function updateSoftKey() {
      const focusedElement = elements.currentPanel.querySelector('.focus');
      if (!focusedElement || focusedElement.classList.contains('none-select')) {
        SettingsSoftkey.hide();
        return;
      }
      const inputElement = focusedElement.querySelector('input');
      if (inputElement && inputElement.checked) {
        SettingsSoftkey.init(deselectParams);
      } else {
        SettingsSoftkey.init(SoftParams.defaultSelect);
      }
      SettingsSoftkey.show();
    }

    function keyDownHandler(evt) {
      evt.stopPropagation();
      ActivityHelper.start({
        name: 'alert_inbox'
      });
    }

    function updateServerDisplay(enabled, severeEnabled) {
      elements.extremeInput.checked = enabled;
      elements.severeInput.checked =
        typeof severeEnabled !== Constants.UNDEFINED ? severeEnabled : enabled;
      elements.severeInput.disabled = !enabled;
      if (enabled) {
        elements.severeItem.classList.remove('none-select');
        elements.severeItem.removeAttribute('aria-disabled');
      } else {
        elements.severeItem.setAttribute('aria-disabled', true);
        elements.severeItem.classList.add('none-select');
      }
    }

    function handleExtremeChange(enabled) {
      updateServerDisplay(enabled);
      const cSet = {};
      cSet['cmas.severe.enabled'] = enabled;
      SettingsDBCache.saveSettings(cSet);
    }

    function addAlertDBListenerForSoftKey() {
      CMAS_DB_LIST.forEach(key => {
        SettingsDBCache.observe(key, true, updateSoftKey, true);
      });
    }

    function removeAlertDBListenerForSoftKey() {
      CMAS_DB_LIST.forEach(key => {
        SettingsDBCache.unobserve(key, updateSoftKey);
      });
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          currentPanel: panel,
          alertInbox: panel.querySelector('#alert-inbox'),
          receiveAlertBody: panel.querySelector('#receive-alert-body'),
          severeItem: panel.querySelector('#severe-item'),
          extremeInput: panel.querySelector(
            'input[data-name="cmas.extreme.enabled"]'
          ),
          severeInput: panel.querySelector(
            'input[data-name="cmas.severe.enabled"]'
          )
        };
        listElements = panel.querySelectorAll('li');
      },

      onBeforeShow() {
        updateSoftKey();
        SettingsDBCache.getSettings(
          ['cmas.settings.show', 'cmas.extreme.enabled', 'cmas.severe.enabled'],
          result => {
            const alertBodyShow = result['cmas.settings.show'];
            const extremeEnabled = result['cmas.extreme.enabled'];
            const severeEnabled = result['cmas.severe.enabled'];
            if (alertBodyShow) {
              elements.receiveAlertBody.classList.remove('hidden');
            }
            updateServerDisplay(extremeEnabled, severeEnabled);
            window.dispatchEvent(new CustomEvent('refresh'));
          }
        );
        SettingsDBCache.observe(
          'cmas.extreme.enabled',
          true,
          handleExtremeChange,
          true
        );
        ListFocusHelper.addEventListener(listElements, updateSoftKey);
        elements.alertInbox.addEventListener('click', keyDownHandler);
        addAlertDBListenerForSoftKey();
      },

      onBeforeHide() {
        SettingsDBCache.unobserve('cmas.extreme.enabled', handleExtremeChange);
        elements.alertInbox.removeEventListener('click', keyDownHandler);
        ListFocusHelper.removeEventListener(listElements, updateSoftKey);
        removeAlertDBListenerForSoftKey();
      }
    });
  };
});
