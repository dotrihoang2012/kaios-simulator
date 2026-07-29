
define([],function() { //eslint-disable-line

  return {
    preset: function preset(panel) {
      const dbList = [];
      const dataNameElements = panel.querySelectorAll('[data-name]');
      for (let i = 0; i < dataNameElements.length; i++) {
        dbList.push(dataNameElements[i].getAttribute('data-name'));
      }
      const dataShowElements = panel.querySelectorAll('[data-show-name]');
      for (let i = 0; i < dataShowElements.length; i++) {
        dbList.push(dataShowElements[i].getAttribute('data-show-name'));
      }
      SettingsDBCache.getSettings(dbList, result => {
        panel = panel || document;

        // Preset all checkboxes
        let rule = 'input[type="checkbox"]:not([data-ignore])';
        const checkboxes = panel.querySelectorAll(rule);
        let count = null;
        let i = null;
        let key = null;
        for (i = 0, count = checkboxes.length; i < count; i++) {
          key = checkboxes[i].getAttribute('data-name');
          if (!key) {
            continue;
          }
          if (result[key] !== Constants.UNDEFINED) {
            checkboxes[i].checked = !!result[key];
          }
        }

        // Preset all radio buttons
        rule = 'input[type="radio"]:not([data-ignore])';
        const radios = panel.querySelectorAll(rule);
        for (i = 0, count = radios.length; i < count; i++) {
          key = radios[i].getAttribute('data-name');
          if (!key) {
            continue;
          }
          if (result[key] !== Constants.UNDEFINED) {
            radios[i].checked = result[key] === radios[i].value;
          }
        }

        // Preset all text inputs
        rule = 'input[type="text"]:not([data-ignore])';
        const texts = panel.querySelectorAll(rule);
        for (i = 0, count = texts.length; i < count; i++) {
          key = texts[i].getAttribute('data-name');
          if (!key) {
            continue;
          }
          if (result[key] !== Constants.UNDEFINED) {
            texts[i].value = result[key];
          }
        }

        // Preset all range inputs
        rule = 'input[type="range"]:not([data-ignore])';
        const ranges = panel.querySelectorAll(rule);
        for (i = 0, count = ranges.length; i < count; i++) {
          key = ranges[i].getAttribute('data-name');
          if (!key) {
            continue;
          }
          if (result[key] !== Constants.UNDEFINED) {
            ranges[i].value = parseFloat(result[key]);
          }
        }

        // Preset all select
        const selects = panel.querySelectorAll('select');
        for (i = 0, count = selects.length; i < count; i++) {
          const select = selects[i];
          key = select.getAttribute('data-name');
          if (!key) {
            continue;
          }
          if (result[key] !== Constants.UNDEFINED) {
            const value = result[key];
            const option = `option[value="${value}"]`;
            const selectOption = select.querySelector(option);
            if (selectOption) {
              selectOption.selected = true;
            }
          }
        }

        // Preset all small with data-name fields
        rule = 'small[data-name]:not([data-ignore])';
        const smallFields = panel.querySelectorAll(rule);
        for (i = 0, count = smallFields.length; i < count; i++) {
          key = smallFields[i].getAttribute('data-name');

          if (result[key] !== Constants.UNDEFINED) {
            smallFields[i].textContent = result[key];
          }
        }

        rule = '[data-show-name]:not([data-ignore])';
        const hiddenItems = panel.querySelectorAll(rule);
        for (i = 0; i < hiddenItems.length; i++) {
          key = hiddenItems[i].dataset.showName;
          hiddenItems[i].classList.toggle('hidden', !result[key]);
        }
      });
    },

    /**
     * When a link element is clicked, the function navigates the app to the
     * panel of the id specified by the "href" attribute of the element.
     *
     * @alias module:PanelUtils#handleLinkClick
     * @param {Event} event
     */
    handleLinkClick: function handleLinkClick(panel, event) {
      const { target } = event;
      let href = null;

      const nodeName = target.nodeName.toLowerCase();
      if (nodeName !== 'a' || target.parentNode.hasAttribute('aria-disabled')) {
        return;
      }
      href = target.getAttribute('href');
      if (!href || href === '#') {
        return;
      }

      Settings.setCurrentPanel(href);
      event.preventDefault();
    },

    handleChange: function handleChange(panel, event) {
      const { target } = event;
      if (!target.getAttribute('data-name')) {
        return;
      }

      const { type } = target;
      let value = null;
      switch (type) {
        case 'checkbox':
          value = target.checked; // Boolean
          break;
        case 'range':
          /*
           * Bug 906296:
           *   We parseFloat() once to be able to round to 1 digit, then
           *   we parseFloat() again to make sure to store a Number and
           *   not a String, otherwise this will make Gecko unable to
           *   apply new settings.
           */
          value = parseFloat(parseFloat(target.value).toFixed(1)); // Float
          break;
        case 'select-one':
        case 'radio':
        case 'text':
        case 'password':
          if (target.dataset.valueType === 'integer') {
            // Integer
            value = parseInt(target.value, 10);
          } else if (target.dataset.valueType === 'boolean') {
            value = (target.value === 'true') || false; // eslint-disable-line
          } else {
            // Default as text
            value = target.value; // eslint-disable-line
          }
          break;
        default:
          break;
      }
      const cSet = {};
      cSet[target.getAttribute('data-name')] = value;
      SettingsDBCache.saveSettings(cSet);
    }
  };
});
