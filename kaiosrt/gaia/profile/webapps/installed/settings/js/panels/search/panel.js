/* global SearchProvider */


define('panels/search/search',['require'],function(require) { // eslint-disable-line

  function Search() {
    this.searchEngineSelect = null;
  }

  Search.prototype.init = function init(searchEngineSelect) {
    this.searchEngineSelect = searchEngineSelect;
    SearchProvider.ready().then(() => {
      this.drawProviders();
      /*
       * Listen for updates as the providers may be updated
       * within the search app
       */
      SearchProvider.providerUpdated(this.drawProviders.bind(this));
    });
  };

  /**
   * Generate <options> for the search engine <select> element.
   *
   * @this
   */
  Search.prototype.drawProviders = function drawProviders() {
    if (!this.searchEngineSelect) {
      return;
    }

    this.searchEngineSelect.innerHTML = '';

    const selectFragment = document.createDocumentFragment();
    const optionNode = document.createElement('option');

    const providers = SearchProvider.providers();

    Object.keys(providers).forEach(provider => {
      const option = optionNode.cloneNode();
      option.value = provider;
      option.text = providers[provider].title;
      if (provider === SearchProvider.selected()) {
        option.selected = true;
      }
      selectFragment.appendChild(option);
    });

    this.searchEngineSelect.appendChild(selectFragment);
  };

  return () => {
    return new Search();
  };
});


define('panels/search/panel',['require','modules/settings_panel','panels/search/search'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');
  const Search = require('panels/search/search');
  return function creatSearchPanel() {
    let currentPanel = null;

    function handleKeyDown(e) {
      switch (e.key) {
        case 'Accept':
        case 'Enter':
          if (currentPanel.querySelector('.focus') !== null) {
            const select = currentPanel.querySelector('.focus select');
            select.focus();
          }
          break;
        default:
          break;
      }
    }
    return SettingsPanel({
      onInit(panel) {
        currentPanel = panel;
        const searchEngineSelect = panel.querySelector(
          '[data-name="search.provider"]'
        );
        const search = Search();
        search.init(searchEngineSelect);
      },
      onBeforeShow() {
        SettingsSoftkey.init(SoftParams.defaultSelect);
        SettingsSoftkey.show();
        window.addEventListener('keydown', handleKeyDown);
      },
      onBeforeHide() {
        SettingsSoftkey.hide();
        window.removeEventListener('keydown', handleKeyDown);
      }
    });
  };
});

