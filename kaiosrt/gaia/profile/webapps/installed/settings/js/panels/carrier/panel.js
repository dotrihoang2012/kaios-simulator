/* global SimCardHelper */

define(['require','modules/settings_panel'],function(require) { //eslint-disable-line

  const SettingsPanel = require('modules/settings_panel');

  return function createCarrierPanel() {
    let listElements = null;
    let elements = null;

    function handleDataConnection() {
      ToastHelper.showToast('changessaved');
    }

    function updateUIBySlot() {
      if (SimCardHelper.isDoubleSimSlot()) {
        elements.carrierSim2.classList.remove('hidden');
        elements.carrierSim1
          .querySelector('span')
          .setAttribute('data-l10n-id', 'carrier-sim1');
        SimCardHelper.getOperatorName(ApiManager.connections[0]).then(value => {
          elements.carrierSim1Desc.textContent = value.toString();
        });
        SimCardHelper.getOperatorName(ApiManager.connections[1]).then(value => {
          elements.carrierSim2Desc.textContent = value.toString();
        });

        elements.apnSim2.classList.remove('hidden');
        elements.apnSim1
          .querySelector('span')
          .setAttribute('data-l10n-id', 'apn-sim1');
      } else {
        elements.carrierSim2.classList.add('hidden');
        elements.carrierSim1
          .querySelector('span')
          .setAttribute('data-l10n-id', 'dataNetwork');
        SimCardHelper.getOperatorName(ApiManager.connections[0]).then(value => {
          elements.carrierSim1Desc.textContent = value.toString();
        });

        elements.apnSim2.classList.add('hidden');
        elements.apnSim1
          .querySelector('span')
          .setAttribute('data-l10n-id', 'apnSettings');
      }
    }

    function handleEvent(evt) {
      const { target } = evt;
      evt.preventDefault();
      evt.stopPropagation();
      switch (target.id) {
        case 'carrier-sim1':
          Settings.setCurrentPanel('carrier_detail', {
            serviceId: 0
          });
          break;
        case 'carrier-sim2':
          Settings.setCurrentPanel('carrier_detail', {
            serviceId: 1
          });
          break;
        case 'apn-sim1':
          Settings.setCurrentPanel('apn_settings', { serviceId: 0 });
          break;
        case 'apn-sim2':
          Settings.setCurrentPanel('apn_settings', { serviceId: 1 });
          break;
        default:
          break;
      }
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          carrierSim1: panel.querySelector('#carrier-sim1'),
          carrierSim1Desc: panel.querySelector('#carrier-sim1 small'),
          carrierSim2: panel.querySelector('#carrier-sim2'),
          carrierSim2Desc: panel.querySelector('#carrier-sim2 small'),
          dataConnectionSelect: panel.querySelector(
            '#liItem-dataConnection select'
          ),
          dataRoaming: panel.querySelector('#liItem-dataRoaming'),
          dataRoamingDesc: panel.querySelector('#data-roaming-desc'),
          roamingPreference: panel.querySelector(
            '#operator-roaming-preference'
          ),
          apnSim1: panel.querySelector('#apn-sim1'),
          apnSim1Desc: panel.querySelector('#apn-sim1 small'),
          apnSim2: panel.querySelector('#apn-sim2'),
          apnSim2Desc: panel.querySelector('#apn-sim2 small')
        };
        listElements = panel.querySelectorAll('#carrier li');
        if (ActivityHandler.currentActivity) {
          if (ActivityHandler.activityPanelId === 'connectivity_settings') {
            const header = panel.querySelector('gaia-header');
            header.setAttribute('data-href', '#connectivity_settings');
          }
        }
      },

      onBeforeShow(panel) {
        SettingsSoftkey.init(SoftParams.defaultSelect);
        ListFocusHelper.updateSoftkey(panel);
        ListFocusHelper.addEventListener(listElements);
        Customization.initUIForItem(['dataConnection', 'dataRoaming']);
        Customization.addListener([
          'data.settings.ui',
          'dm.data.settings.ui',
          'data.roaming.settings.ui',
          'airplaneMode.status',
          'ril.data.roaming_enabled'
        ]);
        updateUIBySlot();
        elements.dataConnectionSelect.addEventListener(
          'change',
          handleDataConnection
        );
        elements.carrierSim1.addEventListener('click', handleEvent);
        elements.carrierSim2.addEventListener('click', handleEvent);
        elements.apnSim1.addEventListener('click', handleEvent);
        elements.apnSim2.addEventListener('click', handleEvent);
      },

      onBeforeHide() {
        Customization.removeListener([
          'data.settings.ui',
          'dm.data.settings.ui',
          'data.roaming.settings.ui',
          'airplaneMode.status',
          'ril.data.roaming_enabled'
        ]);
        ListFocusHelper.removeEventListener(listElements);
        elements.dataConnectionSelect.removeEventListener(
          'change',
          handleDataConnection
        );
        elements.carrierSim1.removeEventListener('click', handleEvent);
        elements.carrierSim2.removeEventListener('click', handleEvent);
        elements.apnSim1.removeEventListener('click', handleEvent);
        elements.apnSim2.removeEventListener('click', handleEvent);
      }
    });
  };
});
