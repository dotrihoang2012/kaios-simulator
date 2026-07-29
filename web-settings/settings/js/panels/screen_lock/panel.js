
define('panels/screen_lock/panel',['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createScreenLock() {
    let elements = null;

    function showDialog(mode) {
      Settings.setCurrentPanel('screen_lock_passcode', {
        mode,
        origin: '#screen_lock'
      });
      window.dispatchEvent(
        new CustomEvent('lazyload', {
          detail: document.getElementById('screen_lock_passcode')
        })
      );
    }

    function changeSelect() {
      if (elements.screenLockSelect.value === 'true') {
        showDialog('create');
      } else {
        showDialog('confirm');
      }
      window.dispatchEvent(new CustomEvent('refresh'));
    }

    function updateUI(enabled) {
      updatePasscode(enabled);
      elements.screenLockSelect.value = enabled;
      if (enabled) {
        elements.introContainer.classList.add('hidden');
      } else {
        elements.introContainer.classList.remove('hidden');
      }
      window.dispatchEvent(new CustomEvent('refresh'));
    }

    function updatePasscode(enabled) {
      elements.panel.dataset.passcodeEnabled = enabled;
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          panel,
          passcodeEdit: panel.querySelector('.passcode-edit'),
          screenLockSelect: panel.querySelector('#screen-lock select'),
          introContainer: panel.querySelector('.more-description-container')
        };
        elements.passcodeEdit.onclick = () => {
          showDialog('edit');
        };
      },

      onBeforeShow() {
        elements.screenLockSelect.addEventListener('change', changeSelect);
        SettingsDBCache.observe(
          'lockscreen.passcode-lock.enabled',
          false,
          updateUI
        );

        SettingsSoftkey.init(SoftParams.defaultSelect);
        SettingsSoftkey.show();
      },

      onBeforeHide() {
        elements.screenLockSelect.removeEventListener('change', changeSelect);
        SettingsDBCache.unobserve('lockscreen.passcode-lock.enabled', updateUI);
        SettingsSoftkey.hide();
      }
    });
  };
});

