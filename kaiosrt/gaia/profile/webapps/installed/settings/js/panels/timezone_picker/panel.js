
define(['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function crateTimeZonePicker() {
    let timezonePicker = null;
    let defaultTimezone = null;
    let timezonePanel = null;
    const softkeyParams = {
      menuClassName: 'menu-button',
      header: {
        l10nId: 'message'
      },
      items: [
        {
          name: 'Cancel',
          l10nId: 'cancel',
          priority: 1,
          method() {
            NavigationMap.navigateBack();
          }
        },
        {
          name: 'Select',
          l10nId: 'select',
          priority: 2,
          method() {
            handleSelectChange();
            if (document.body.classList.contains('readout')) {
              setTimeout(() => {
                NavigationMap.navigateBack();
              }, 300);
            } else {
              NavigationMap.navigateBack();
            }
          }
        }
      ]
    };

    function fillCities(list, defaultTimezoneID) {
      defaultTimezone = defaultTimezoneID;
      for (let i = 0; i < list.length; i++) {
        const li = document.createElement('li');
        const label = document.createElement('label');
        const city = document.createElement('p');
        const offset = document.createElement('small');
        li.setAttribute('role', 'presentation');
        li.setAttribute('id', list[i].city);
        const key = list[i].city.replace(/.*?\//, '');
        city.dataset.l10nId = key;
        offset.textContent = `UTC${list[i].offset.substring(
          0,
          list[i].offset.indexOf(',')
        )}`;

        timezonePicker.appendChild(li);
        li.appendChild(label);
        label.appendChild(city);
        label.appendChild(offset);

        if (list[i].city === defaultTimezoneID) {
          label.classList.add('checked');
        }
      }
    }

    function saveTimeZone(city) {
      SettingsDBCache.saveSettings({ 'time.timezone': city });
      defaultTimezone = city;
    }

    function updatePanel() {
      const oldFocused = timezonePanel.querySelector('li.focus');
      oldFocused.classList.remove('focus');
      const newFocused = document.getElementById(defaultTimezone);
      newFocused.focus();
      newFocused.classList.add('focus');
    }

    function handleSelectChange() {
      const previousSelect = timezonePanel.querySelector('label.checked');
      previousSelect.classList.remove('checked');

      const focusedLi = timezonePanel.querySelector('li.focus');
      const currentSelect = focusedLi.querySelector('label');
      currentSelect.classList.add('checked');
      saveTimeZone(focusedLi.id);
    }

    return SettingsPanel({
      onInit(panel, option) {
        timezonePanel = panel;
        timezonePicker = panel.querySelector('.timezone');
        fillCities(option.list, option.defaultCity);
      },

      onBeforeShow() {
        SettingsDBCache.getSetting('time.timezone').then(value => {
          if (value !== defaultTimezone) {
            defaultTimezone = value;
            const previousSelect = timezonePanel.querySelector('label.checked');
            previousSelect.classList.remove('checked');
            const currentSelect = timezonePanel.querySelector(
              '#defaultTimezone label'
            );
            currentSelect.classList.add('checked');
          }
        });

        SettingsSoftkey.init(softkeyParams);
        SettingsSoftkey.show();
        window.addEventListener('panelready', updatePanel);
      },

      onBeforeHide() {
        SettingsSoftkey.hide();
        window.removeEventListener('panelready', updatePanel);
      }
    });
  };
});
