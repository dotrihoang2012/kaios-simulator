/* global KeypadHelper */


// eslint-disable-next-line
define('panels/input_methods/panel',['require','modules/settings_panel'],function(require) {
  const SettingsPanel = require('modules/settings_panel');

  return function keypadPanel() {
    const keypadHelper = new KeypadHelper();
    let inputLanguagesButton = null;
    let currentLayouts = null;
    let inputMethodManager = null;

    function initSoftKey() {
      const params = {
        menuClassName: 'menu-button',
        header: {
          l10nId: 'message'
        },
        items: [
          {
            name: 'Select',
            l10nId: 'select',
            priority: 2
          }
        ]
      };

      SettingsSoftkey.init(params);
      SettingsSoftkey.show();
    }

    // To show current enabled input language's name.
    function updateLanguageState(layouts) {
      const selectedLanguages = [];
      const listFragment = document.createDocumentFragment();
      let number = 0;

      // eslint-disable-next-line
      for (let key in layouts) {
        if (!layouts[key]) {
          continue;
        }
        const languageName = keypadHelper.getDisplayLanguageName(key);
        const li = genIMEItemTemplate({
          name: languageName
        });
        li.onclick = () => {
          Settings.setCurrentPanel('input_method_config', {
            Key: key,
            KeypadHelper: keypadHelper
          });
        };
        listFragment.appendChild(li);
        selectedLanguages.push(languageName);
        number++;
      }
      inputMethodManager.innerHTML = '';
      inputMethodManager.appendChild(listFragment);
      currentLayouts = layouts;

      const selectedLanguagesSmall = document.getElementById(
        'input-languages-desc'
      );
      selectedLanguagesSmall.textContent = '';
      if (number <= 3) {
        selectedLanguagesSmall.textContent = selectedLanguages.join(', ');
      } else {
        l10n.setAttributes(selectedLanguagesSmall, 'languages-selected', {
          n: number
        });
      }
      window.dispatchEvent(new CustomEvent('refresh'));
    }

    function genIMEItemTemplate(itemData) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      const span = document.createElement('span');
      span.textContent = itemData.name;
      link.classList.add('menu-item');
      link.appendChild(span);
      item.appendChild(link);
      return item;
    }

    return SettingsPanel({
      onInit: function onInit(panel) {
        inputMethodManager = panel.querySelector('.input-methods-manager');
        inputLanguagesButton = panel.querySelector('#input-languages');
        keypadHelper.start();
        keypadHelper.getLayouts().then(layouts => {
          updateLanguageState(layouts);
          currentLayouts = layouts;

          inputLanguagesButton.onclick = () => {
            Settings.setCurrentPanel('input_languages_selection', {
              KeypadHelper: keypadHelper,
              Layouts: currentLayouts
            });
          };
        });
      },

      onBeforeShow: function onBeforeShow() {
        keypadHelper.setLayoutsChangedCallback(updateLanguageState);
        initSoftKey();
      }
    });
  };
});

