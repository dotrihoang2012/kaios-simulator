

// eslint-disable-next-line
define([],function() {
  const InputMethodConfig = function InputMethodConfig() {
    this.elements = null;
    this.keypadHelper = null;
    this.t9Enabled = null;
    this.wordSuggestion = null;
    this.key = '';
  };

  InputMethodConfig.prototype = {
    init: function init(elements, options) {
      this.elements = elements;
      this.keypadHelper = options.KeypadHelper;
      this.handleSelectValueChange = this.selectValueChanged.bind(this);
    },

    showConfig: function showConfig(panel, key) {
      const predictive = this.elements.list.querySelector('.use-predictive');
      const wordSug = this.elements.list.querySelector('.word-suggestion');
      const userDict = this.elements.list.querySelector('.user-dictionary');
      if (key) {
        this.key = key;
      }
      this.keypadHelper.getT9Enabled().then(tValue => {
        this.t9Enabled = tValue;
        if (this.key.startsWith('chinese')) {
          predictive.setAttribute('aria-disabled', true);
          predictive.classList.add('none-select');
          wordSug.classList.remove('hidden');
          this.keypadHelper.getWordSuggestion().then(wValue => {
            this.wordSuggestion = wValue;
            this.addKeyListener(panel);
          });
        } else {
          if (this.key === 'korean') {
            predictive.setAttribute('aria-disabled', true);
            predictive.classList.add('none-select');
          } else {
            predictive.removeAttribute('aria-disabled');
            predictive.classList.remove('none-select');
          }
          wordSug.classList.add('hidden');
          this.addKeyListener(panel);
        }
      });

      this.elements.configTitle.textContent = this.keypadHelper.getDisplayLanguageName(
        this.key
      );
      // Only show user dictionary settings in English, may need adjust in the future
      if (this.key.startsWith('english')) {
        userDict.classList.remove('hidden');
        userDict.onclick = () => {
          Settings.setCurrentPanel('user_dictionary', {
            KeypadHelper: this.keypadHelper,
            Lang: this.key
          });
        };
      } else {
        userDict.classList.add('hidden');
      }
    },

    selectValueChanged: function selectValueChanged(evt) {
      evt.stopPropagation();
      evt.preventDefault();
      const select = evt.target;
      const selectValue = select.value === 'true';
      if (select.id === 't9Enabled') {
        this.t9Enabled[this.key] = selectValue;
        this.keypadHelper.setT9Enabled(this.t9Enabled);
      } else if (select.id === 'wordSuggestion') {
        this.wordSuggestion[this.key] = selectValue;
        this.keypadHelper.setWordSuggestion(this.wordSuggestion);
      }
    },

    addKeyListener: function addKeyListener(panel) {
      const valueSelectors = panel.querySelectorAll('li:not(.hidden) select');
      for (let i = 0; i < valueSelectors.length; i++) {
        if (valueSelectors[i].id === 't9Enabled') {
          valueSelectors[i].value = this.t9Enabled[this.key];
        } else if (valueSelectors[i].id === 'wordSuggestion') {
          valueSelectors[i].value = this.wordSuggestion[this.key];
        }
        if (!valueSelectors[i].hasAttribute('aria-disabled')) {
          valueSelectors[i].addEventListener(
            'change',
            this.handleSelectValueChange
          );
        }
      }
    },

    removeKeyListener: function removeKeyListener(panel) {
      const valueSelectors = panel.querySelectorAll('select');
      for (let i = 0; i < valueSelectors.length; i++) {
        valueSelectors[i].removeEventListener(
          'change',
          this.handleSelectValueChange
        );
      }
    }
  };

  return function inputMethodConfig() {
    return new InputMethodConfig();
  };
});
