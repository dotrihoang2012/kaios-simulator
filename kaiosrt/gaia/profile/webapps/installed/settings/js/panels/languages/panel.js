/* global LanguageList */

define('panels/languages/panel',['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createLanguagePanel() {
    let listElements = null;
    let elements = null;

    function updateDateTime() {
      // Update the date and time samples in the 'languages' panel
      const d = new Date();
      elements.regionDate.textContent = d.toLocaleString(navigator.language, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      elements.regionTime.textContent = d.toLocaleString(navigator.language, {
        hour: 'numeric',
        minute: 'numeric',
        hour12: window.api.hour12
      });
    }

    function onLocalized() {
      updateDateTime();
      SettingsSoftkey.init(SoftParams.defaultSelect);
      SettingsSoftkey.show();
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          langSel: panel.querySelector('select[data-name="language.current"]'),
          regionDate: panel.querySelector('#region-date'),
          regionTime: panel.querySelector('#region-time')
        };
        listElements = panel.querySelectorAll('li');
        LazyLoader.load(
          [`${Constants.SHARD_ORIGIN}/js/helper/language/language_list.js`],
          () => {
            LanguageList.get((languages, currentLang) => {
              const options = document.createDocumentFragment();
              // eslint-disable-next-line
              for (let lang in languages) {
                const isCurrent = lang === currentLang;
                const option = document.createElement('option');
                option.value = lang;
                option.innerHTML = LanguageList.wrapBidi(lang, languages[lang]);
                option.selected = isCurrent;
                options.appendChild(option);
              }
              elements.langSel.innerHTML = '';
              elements.langSel.appendChild(options);
            });
          }
        );
      },

      onBeforeShow() {
        updateDateTime();
        window.addEventListener('localized', onLocalized);
        ListFocusHelper.addEventListener(listElements);
      },
      onBeforeHide() {
        SettingsSoftkey.hide();
        window.removeEventListener('localized', onLocalized);
        ListFocusHelper.removeEventListener(listElements);
      }
    });
  };
});

