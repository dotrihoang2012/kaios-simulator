/* global SimCardHelper,  */

define(['require','modules/settings_panel'],function(require) { //eslint-disable-line

  const SettingsPanel = require('modules/settings_panel');

  return function createFixedDialingNumbersPanel() {
    let listElements = null;
    let serviceId = 0;
    let iccManager = null;
    let elements = null;

    function updateFdnState(value) {
      elements.simFdnSelect.value = value;
    }

    function fdnListItemClick(evt) {
      evt.stopPropagation();
      if (!elements.callFdnListItem.hasAttribute('aria-disabled')) {
        Settings.setCurrentPanel('#call_fdn_list', {
          serviceId
        });
      }
    }

    function showChangePin2Dialog() {
      updateFdnStatus('change_pin2');
    }

    function updateFdnStatus(action) {
      const state = iccManager.pin2CardState;
      switch (state) {
        case 'ready':
        case 'pinRequired':
          Settings.setCurrentPanel('sim_dialog', {
            action,
            backPanel: '#call_fdn_settings',
            cardIndex: serviceId
          });
          break;
        case 'pukRequired':
          Settings.setCurrentPanel('sim_dialog', {
            action: 'unlock_puk2',
            backPanel: '#call_fdn_settings',
            cardIndex: serviceId
          });
          break;
        case 'permanentBlocked':
          disabledUI(true);
          break;
        default:
          break;
      }
    }

    function cardStatusChange(evt) {
      const cardIndex = evt.detail.index;
      if (cardIndex !== serviceId) {
        return;
      }
      updateUI();
    }

    function disabledUI(disabled) {
      const simFdnItem = elements.simFdnSelect.parentNode.parentNode;
      if (disabled) {
        simFdnItem.setAttribute('aria-disabled', 'true');
        elements.callFdnListItem.setAttribute('aria-disabled', 'true');
        elements.resetPin2Item.setAttribute('aria-disabled', 'true');
        elements.puk2LockedInfo.classList.remove('hidden');
        simFdnItem.classList.add('none-select');
        elements.callFdnListItem.classList.add('none-select');
        elements.resetPin2Item.classList.add('none-select');
        elements.resetPin2Button.disabled = true;
      } else {
        simFdnItem.removeAttribute('aria-disabled');
        elements.callFdnListItem.removeAttribute('aria-disabled');
        elements.resetPin2Item.removeAttribute('aria-disabled');
        elements.puk2LockedInfo.classList.add('hidden');
        simFdnItem.classList.remove('none-select');
        elements.callFdnListItem.classList.remove('none-select');
        elements.resetPin2Item.classList.remove('none-select');
        elements.resetPin2Button.disabled = false;
      }
    }

    function updateUI() {
      const state = iccManager.pin2CardState;
      switch (state) {
        case 'ready':
        case 'pinRequired':
          disabledUI(false);
          break;
        case 'pukRequired':
          disabledUI(false);
          break;
        case 'permanentBlocked':
          disabledUI(true);
          break;
        default:
          break;
      }
    }

    function showToggleFdnDialog() {
      const action =
        elements.simFdnSelect.value === 'true' ? 'enable_fdn' : 'disable_fdn';
      updateFdnStatus(action);
    }

    return SettingsPanel({
      onInit(panel, options) {
        listElements = panel.querySelectorAll('li');
        serviceId = options.serviceId || 0;
        elements = {
          panel,
          resetPin2Item: panel.querySelector('#fdn-resetPIN2'),
          simFdnSelect: panel.querySelector('#fdn-enabled'),
          resetPin2Button: panel.querySelector('#fdn-resetPIN2 button'),
          callFdnListItem: panel.querySelector('.call-fdn-list'),
          puk2LockedInfo: panel.querySelector('.puk2-locked-info')
        };
      },

      onBeforeShow(panel, options) {
        serviceId = options.serviceId || serviceId;
        iccManager = SimCardHelper.getIccInfo(serviceId);
        SettingsSoftkey.init(SoftParams.defaultSelect);
        ListFocusHelper.updateSoftkey(panel);
        updateUI();
        SettingsDBCache.observe('ril.fdn.enabled', false, updateFdnState);
        window.addEventListener('SIM-cardstatechange', cardStatusChange);
        elements.resetPin2Button.addEventListener(
          'click',
          showChangePin2Dialog
        );
        elements.callFdnListItem.addEventListener('click', fdnListItemClick);
        elements.simFdnSelect.addEventListener('change', showToggleFdnDialog);
        ListFocusHelper.addEventListener(listElements);
      },
      onBeforeHide() {
        SettingsDBCache.unobserve('ril.fdn.enabled', updateFdnState);
        window.removeEventListener('SIM-cardstatechange', cardStatusChange);
        elements.resetPin2Button.removeEventListener(
          'click',
          showChangePin2Dialog
        );
        elements.callFdnListItem.removeEventListener('click', fdnListItemClick);
        elements.simFdnSelect.removeEventListener(
          'change',
          showToggleFdnDialog
        );
        ListFocusHelper.removeEventListener(listElements);
      }
    });
  };
});
