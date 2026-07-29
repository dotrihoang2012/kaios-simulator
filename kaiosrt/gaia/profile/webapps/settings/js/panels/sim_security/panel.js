/* global SimCardHelper */

define(['require','modules/settings_panel'],function(require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createSimSecurityPanel() {
    let elements = {};
    let listElements = null;

    function updateSimPinByServiceId(serviceId) {
      SimCardHelper.getIccInfo(serviceId)
        .getCardLock('pin')
        .then(
          result => {
            const { enabled } = result;
            if (serviceId === 0) {
              elements.sim1PinChange.classList.toggle('hidden', !enabled);
              elements.sim1PinSelect.options[0].selected = enabled;
              elements.sim1PinSelect.options[1].selected = !enabled;
              elements.sim1PinSelect.classList.remove('hidden');
              elements.sim1PinUnknown.classList.add('hidden');
            } else {
              elements.sim2PinChange.classList.toggle('hidden', !enabled);
              elements.sim2PinSelect.options[0].selected = enabled;
              elements.sim2PinSelect.options[1].selected = !enabled;
              elements.sim2PinSelect.classList.remove('hidden');
              elements.sim2PinUnknown.classList.add('hidden');
            }
            window.dispatchEvent(new CustomEvent('refresh'));
          },
          err => {
            DebugHelper.debug(
              `ERROR: SIM ${serviceId} PIN status checked failed, reason: ${err.message}.`
            );
            ToastHelper.showToast('simpin-status-error');
            if (serviceId === 0) {
              elements.sim1PinSelect.classList.add('hidden');
              elements.sim1PinUnknown.classList.remove('hidden');
            } else {
              elements.sim2Pin.setAttribute('aria-disabled', true);
              elements.sim2Pin.classList.add('none-select');
            }
          }
        );
    }

    function handleChange(evt) {
      evt.stopPropagation();
      const { target } = evt;
      const enabled = target.value === 'true' || false;
      let icc = null;
      switch (target.id) {
        case 'sim-pin-select':
          icc = SimCardHelper.getIccInfo(0);
          if (icc.cardState === 'pukRequired') {
            Settings.setCurrentPanel('sim_dialog', {
              action: 'unlock_puk',
              backPanel: '#sim_security',
              cardIndex: 0
            });
          } else {
            const action = enabled ? 'enable_lock' : 'disable_lock';
            Settings.setCurrentPanel('sim_dialog', {
              action,
              backPanel: '#sim_security',
              cardIndex: 0
            });
          }
          break;
        case 'sim2-pin-select':
          icc = SimCardHelper.getIccInfo(1);
          if (icc.cardState === 'pukRequired') {
            Settings.setCurrentPanel('sim_dialog', {
              action: 'unlock_puk',
              backPanel: '#sim_security',
              cardIndex: 1
            });
          } else {
            const action = enabled ? 'enable_lock' : 'disable_lock';
            Settings.setCurrentPanel('sim_dialog', {
              action,
              backPanel: '#sim_security',
              cardIndex: 1
            });
          }
          break;
        default:
          break;
      }
    }

    function handleEvent(evt) {
      evt.stopPropagation();
      let icc = null;
      const { target } = evt;
      switch (target.id) {
        case 'sim-pin-change':
          icc = SimCardHelper.getIccInfo(0);
          if (icc.cardState === 'pukRequired') {
            Settings.setCurrentPanel('sim_dialog', {
              action: 'unlock_puk',
              backPanel: '#sim_security',
              cardIndex: 0
            });
          } else {
            Settings.setCurrentPanel('sim_dialog', {
              action: 'change_pin',
              backPanel: '#sim_security',
              cardIndex: 0
            });
          }
          break;
        case 'sim2-pin-change':
          icc = SimCardHelper.getIccInfo(1);
          if (icc.cardState === 'pukRequired') {
            Settings.setCurrentPanel('sim_dialog', {
              action: 'unlock_puk',
              backPanel: '#sim_security',
              cardIndex: 1
            });
          } else {
            Settings.setCurrentPanel('sim_dialog', {
              action: 'change_pin',
              backPanel: '#sim_security',
              cardIndex: 1
            });
          }
          break;
        default:
          break;
      }
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          sim1Pin: panel.querySelector('#sim-pin-item'),
          sim1PinSpan: panel.querySelector('#sim-pin-item span'),
          sim1PinSelect: panel.querySelector('#sim-pin-select'),
          sim1PinChange: panel.querySelector('#sim-pin-change'),
          sim1PinChangeSpan: panel.querySelector('#sim-pin-change span'),
          sim1PinUnknown: panel.querySelector('#sim-pin-unknown'),
          sim2Container: panel.querySelector('#sim2-container'),
          sim2Pin: panel.querySelector('#sim2-pin-item'),
          sim2PinSelect: panel.querySelector('#sim2-pin-select'),
          sim2PinChange: panel.querySelector('#sim2-pin-change'),
          sim2PinUnknown: panel.querySelector('#sim2-pin-unknown')
        };
        if (SimCardHelper.isDoubleSimSlot()) {
          elements.sim1PinSpan.setAttribute('data-l10n-id', `simPinWithIndex`);
          elements.sim1PinSpan.setAttribute(
            'data-l10n-args',
            JSON.stringify({ index: 1 })
          );
          elements.sim1PinChangeSpan.setAttribute(
            'data-l10n-id',
            `changeSimPinWithIndex`
          );
          elements.sim1PinChangeSpan.setAttribute(
            'data-l10n-args',
            JSON.stringify({ index: 1 })
          );
          elements.sim2Container.classList.remove('hidden');
        } else {
          elements.sim1PinSpan.setAttribute('data-l10n-id', `simPin`);
          elements.sim1PinChangeSpan.setAttribute(
            'data-l10n-id',
            `newpinTitle`
          );
        }
      },

      onBeforeShow(panel) {
        SettingsSoftkey.init(SoftParams.defaultSelect);
        ListFocusHelper.updateSoftkey(panel);
        listElements = panel.querySelectorAll('li');
        ListFocusHelper.addEventListener(listElements);
        elements.sim1PinSelect.addEventListener('change', handleChange);
        elements.sim2PinSelect.addEventListener('change', handleChange);
        elements.sim1PinChange.addEventListener('click', handleEvent);
        elements.sim2PinChange.addEventListener('click', handleEvent);
        if (SimCardHelper.isDoubleSimSlot()) {
          if (ApiManager.connections[0].iccId) {
            updateSimPinByServiceId(0);
          } else {
            elements.sim1Pin.setAttribute('aria-disabled', true);
            elements.sim1Pin.classList.add('none-select');
          }
          if (ApiManager.connections[1].iccId) {
            updateSimPinByServiceId(1);
          } else {
            elements.sim2Pin.setAttribute('aria-disabled', true);
            elements.sim2Pin.classList.add('none-select');
          }
        } else {
          updateSimPinByServiceId(0);
        }
      },

      onBeforeHide() {
        ListFocusHelper.removeEventListener(listElements);
        elements.sim1PinSelect.removeEventListener('change', handleChange);
        elements.sim2PinSelect.removeEventListener('change', handleChange);
        elements.sim1PinChange.removeEventListener('click', handleEvent);
        elements.sim2PinChange.removeEventListener('click', handleEvent);
      }
    });
  };
});
