
define(['require','modules/settings_panel'],function (require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createTonesPanel() {
    const RINGER_KEY = 'dialer.ringtone';
    const NOTICE_KEY = 'notification.ringtone';
    const VIBRATION_ENABLED = 'vibration.enabled';

    const INTERNAL_STORAGE = ApiManager.getDeviceStorage('sdcard');
    let elements = null;

    function showToast() {
      const cSet = {};
      if (elements.vibrateSelect.value === 'false') {
        ToastHelper.showToast('vibrate-off');
        cSet[VIBRATION_ENABLED] = false;
      } else {
        ToastHelper.showToast('vibrate-on');
        cSet[VIBRATION_ENABLED] = true;
      }
      SettingsDBCache.saveSettings(cSet);
    }

    function updateVibration(value) {
      elements.vibrateSelect.value = value;
    }

    function updateTonesUI(key, nameValue) {
      let element = null;
      if (key === RINGER_KEY) {
        element = elements.ringTonesDesc;
      } else {
        element = elements.noticeAlertsDesc;
      }
      if (nameValue) {
        if (nameValue.l10nID) {
          element.setAttribute('data-l10n-id', nameValue.l10nID);
        } else {
          element.removeAttribute('data-l10n-id');
          element.textContent = nameValue.toString();
        }
      } else {
        SettingsDBCache.getSetting(`${key}.name`).then(value => {
          if (value.l10nID) {
            element.setAttribute('data-l10n-id', value.l10nID);
          } else {
            element.removeAttribute('data-l10n-id');
            element.textContent = value.toString();
          }
        });
      }
    }

    function saveTonesToSettings(key, result) {
      const cSet = {};
      cSet[key] = result.filename;
      cSet[`${key}.id`] = result.id;
      const name = result.l10nID ? { l10nID: result.l10nID } : result.name;
      cSet[`${key}.name`] = name;
      SettingsDBCache.saveSettings(cSet);
      updateTonesUI(key, name);
    }

    function pickTone(type, allowNone, key) {
      SettingsDBCache.getSetting(`${key}.id`).then(value => {
        ActivityHelper.start({
          name: 'pick',
          data: {
            type,
            allowNone,
            currentToneID: value
          }
        }).then(result => {
          const fileName = result.filename;
          if (fileName.indexOf(Constants.SHARD_ORIGIN) >= 0) {
            saveTonesToSettings(key, result);
          } else {
            const file = fileName.substring(fileName.lastIndexOf('/') + 1);

            INTERNAL_STORAGE.delete(Constants.TONE_PATH + file).then(
              () => {
                DebugHelper.debug('delete file success');
                const saveRequest = INTERNAL_STORAGE.addNamed(
                  result.blob,
                  Constants.TONE_PATH + file
                );
                saveRequest.onsuccess = () => {
                  DebugHelper.debug('Save tones success');
                  saveTonesToSettings(key, result);
                };
                saveRequest.onerror = err => {
                  DebugHelper.log(`Save tones error${JSON.stringify(err)}`);
                };
              },
              err => {
                DebugHelper.log(
                  `Unable to delete the file: ${JSON.stringify(err)}`
                );
              }
            );
          }
        });
      });
    }

    function handleEvent(evt) {
      const { target } = evt;
      switch (target.id) {
        case 'ring-tones':
          pickTone('ringtone', false, RINGER_KEY);
          break;
        case 'notice-alerts':
          pickTone('alerttone', true, NOTICE_KEY);
          break;
        default:
          break;
      }
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          vibrateSelect: panel.querySelector('#vibrate select'),
          ringTones: panel.querySelector('#ring-tones'),
          ringTonesDesc: panel.querySelector('#ring-tones small'),
          noticeAlerts: panel.querySelector('#notice-alerts'),
          noticeAlertsDesc: panel.querySelector('#notice-alerts small')
        };
        if (ApiManager.telephony) {
          elements.ringTones.classList.remove('hidden');
        }
      },

      onBeforeShow() {
        SettingsSoftkey.init(SoftParams.defaultSelect);
        SettingsSoftkey.show();
        updateTonesUI(RINGER_KEY);
        updateTonesUI(NOTICE_KEY);
        SettingsDBCache.observe(VIBRATION_ENABLED, true, updateVibration);
        elements.ringTones.addEventListener('click', handleEvent);
        elements.noticeAlerts.addEventListener('click', handleEvent);
        elements.vibrateSelect.addEventListener('change', showToast);
      },

      onBeforeHide() {
        SettingsSoftkey.hide();
        SettingsDBCache.unobserve(VIBRATION_ENABLED, updateVibration);
        elements.ringTones.removeEventListener('click', handleEvent);
        elements.noticeAlerts.removeEventListener('click', handleEvent);
        elements.vibrateSelect.removeEventListener('change', showToast);
      }
    });
  };
});
