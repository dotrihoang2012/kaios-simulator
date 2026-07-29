
define(['require','modules/settings_panel','panels/accessibility/slider_handler'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');
  const SliderHandler = require('panels/accessibility/slider_handler');

  return function createAccessibilityPanel() {
    const listElements = document.querySelectorAll('#accessibility li');
    let elements = {};
    const CAPTIONS_KEY = 'accessibility.captions';
    const SCREENREADER_KEY = 'accessibility.screenreader';
    const VOLUME_BALANCE_KEY = 'accessibility.volume_balance';
    const VOLUME_BALANCE_STRING = [
      'L5',
      'L4',
      'L3',
      'L2',
      'L1',
      '0',
      'R1',
      'R2',
      'R3',
      'R4',
      'R5'
    ];

    function updateCaptionsStatus(enabled) {
      const l10nId = enabled ? 'on' : 'off';
      elements.captionsDesc.setAttribute('data-l10n-id', l10nId);
    }

    function updateReadoutStatus(enabled) {
      const l10nId = enabled ? 'on' : 'off';
      elements.readoutModeDesc.setAttribute('data-l10n-id', l10nId);
    }

    function updateVolumeBalanceStatus(value) {
      const convertValue = value / 10;
      elements.volumebalanceDesc.setAttribute(
        'data-l10n-id',
        `balance-${VOLUME_BALANCE_STRING[convertValue]}`
      );
    }

    function updateRttStatus(enabled) {
      const l10nId = enabled ? 'on' : 'off';
      elements.rttDesc.setAttribute('data-l10n-id', l10nId);
    }

    return SettingsPanel({
      onInit: function onInit(panel) {
        elements = {
          captionsDesc: panel.querySelector('.captions small'),
          readOutMode: panel.querySelector('.readout-mode').parentNode,
          readoutModeDesc: panel.querySelector('.readout-mode small'),
          rttDesc: panel.querySelector('#rtt-desc'),
          volumeBalance: panel.querySelector('.slider-container'),
          volumebalanceDesc: panel.querySelector(
            '.slider-container span.level'
          ),
          volumebalanceContainer: panel.querySelector('.slider-container')
        };

        const volumebalance = SliderHandler();
        volumebalance.init(elements.volumebalanceContainer);
        DeviceFeature.ready(() => {
          if (
            DeviceFeature.getValue('lowMemory') !== 'true' &&
            DeviceFeature.getValue('readout') === 'true'
          ) {
            elements.readOutMode.classList.remove('hidden');
          }
          if (DeviceFeature.getValue('rtt') === 'true') {
            const rttHeader = panel.querySelector('#rtt-header');
            const rttItem = panel.querySelector('#rtt-item');
            rttHeader.classList.remove('hidden');
            rttItem.classList.remove('hidden');
          }
        });

        elements.volumeBalance.onfocus = () => {
          elements.volumebalanceDesc.setAttribute('aria-live', 'assertive');
        };
        elements.volumeBalance.onblur = () => {
          elements.volumebalanceDesc.removeAttribute('aria-live');
        };
      },

      onBeforeShow(panel) {
        SettingsSoftkey.init(SoftParams.defaultSelect);
        SettingsSoftkey.show();
        ListFocusHelper.updateSoftkey(panel);
        ListFocusHelper.addEventListener(listElements);
      },

      onBeforeHide() {
        SettingsSoftkey.hide();
        ListFocusHelper.removeEventListener(listElements);
      },

      onShow() {
        SettingsDBCache.observe(CAPTIONS_KEY, false, updateCaptionsStatus);

        SettingsDBCache.observe(SCREENREADER_KEY, false, updateReadoutStatus);

        SettingsDBCache.observe(
          VOLUME_BALANCE_KEY,
          50,
          updateVolumeBalanceStatus
        );
        SettingsDBCache.observe('ril.rtt.enabled', false, updateRttStatus);
      },

      onHide() {
        SettingsDBCache.unobserve(CAPTIONS_KEY, updateCaptionsStatus);

        SettingsDBCache.unobserve(SCREENREADER_KEY, updateReadoutStatus);

        SettingsDBCache.unobserve(
          VOLUME_BALANCE_KEY,
          updateVolumeBalanceStatus
        );
        SettingsDBCache.unobserve('ril.rtt.enabled', updateRttStatus);
      }
    });
  };
});
