/* global SearchProvider */


define(['require'],function(require) { // eslint-disable-line

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
