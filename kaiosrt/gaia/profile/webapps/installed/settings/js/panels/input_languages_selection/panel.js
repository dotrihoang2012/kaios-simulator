

// eslint-disable-next-line
define('panels/input_languages_selection/panel',['require','modules/settings_panel'],function(require) {
  const SettingsPanel = require('modules/settings_panel');

  return function selectInputLanguagePanel() {
    let cPanel = null;
    let keypadHelper = null;
    let layouts = {};
    let keypadContainer = null;
    const listElements = [];

    function initUI() {
      // eslint-disable-next-line
      for (let key in layouts) {
        if (!key) {
          continue;
        }
        const li = document.createElement('li');
        li.setAttribute('role', 'menuitem');
        const label = document.createElement('label');
        label.className = 'pack-checkbox';
        const input = document.createElement('input');
        input.name = key;
        input.type = 'checkbox';
        input.checked = layouts[key];
        input.onchange = evt => {
          evt.stopPropagation();
          evt.preventDefault();
          updateLayoutsSettings(evt.target);
          updateSoftKey();
        };
        const span = document.createElement('span');
        const bdiName = document.createElement('bdi');
        bdiName.textContent = keypadHelper.getDisplayLanguageName(key);

        span.appendChild(bdiName);
        label.appendChild(input);
        label.appendChild(span);
        li.appendChild(label);
        let rNode = null;
        if (input.checked) {
          listElements.unshift(li);
          rNode = keypadContainer.firstChild;
        } else {
          listElements.push(li);
        }
        keypadContainer.insertBefore(li, rNode);
      }
    }

    function updateUI() {
      // eslint-disable-next-line
      for (let key in layouts) {
        if (!key) {
          continue;
        }
        const rule = `input[name="${key}"]:not([data-ignore])`;
        keypadContainer.querySelector(rule).checked = layouts[key];
      }
    }

    function updateSoftKey() {
      const focusLi = keypadContainer.querySelector('li.focus');
      let input = null;
      let softKey = null;
      if (focusLi) {
        input = focusLi.querySelector('input');
      } else {
        input = keypadContainer.querySelector('li input');
      }
      if (input.checked) {
        softKey = {
          name: 'Deselect',
          l10nId: 'deselect',
          priority: 2
        };
      } else {
        softKey = {
          name: 'Select',
          l10nId: 'select',
          priority: 2
        };
      }
      const params = {
        menuClassName: 'menu-button',
        header: {
          l10nId: 'message'
        },
        items: [softKey]
      };
      SettingsSoftkey.init(params);
      SettingsSoftkey.show();
    }

    function updateLayoutsSettings(target) {
      layouts[target.name] = target.checked;
      keypadHelper.setLayouts(layouts);
    }

    function checkInputLanguage() {
      const allCheckBoxes = cPanel.querySelectorAll('input[type=checkbox]');
      let i = allCheckBoxes.length - 1;
      let count = 0;

      // To count user selected checkbox
      for (i; i >= 0; i--) {
        if (!allCheckBoxes[i].checked) {
          count++;
        }
      }

      /*
       * If user uncheck all of these languages, Default config language
       * will still be checked automatically.
       */
      if (count === allCheckBoxes.length) {
        keypadHelper.setDefaultLayout();
      }
    }

    return SettingsPanel({
      onInit: function onInit(panel, options) {
        cPanel = panel;
        keypadHelper = options.KeypadHelper;
        if (layouts !== options.Layouts) {
          layouts = options.Layouts;
          keypadContainer = document.getElementById('keypad-container');
          keypadContainer.innerHTML = '';
          initUI();
        }
      },

      onBeforeShow: function onBeforeShow(panel, options) {
        layouts = options.Layouts;
        updateUI();
        updateSoftKey();
        ListFocusHelper.addEventListener(listElements, updateSoftKey);
      },

      onBeforeHide: function onBeforeHide() {
        checkInputLanguage();
        ListFocusHelper.removeEventListener(listElements, updateSoftKey);
      }
    });
  };
});

