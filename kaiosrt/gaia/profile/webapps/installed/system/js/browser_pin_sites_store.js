/* global asyncStorage */
'use strict';

(function () {
  const PRESITES_LOADED_KEY = 'browser-presites-loaded';
  const PINSITES_KEY = 'browser-pinsites';
  const MAX_PINSITES_NUM = 6;
  const systemOrigin = window.AppOrigin.getOrigin('system');
  const preloadPath = {
    preloadTopSites: systemOrigin + '/browser/js/inittopsites.json',
    preloadCustomizationTopSites: systemOrigin + '/browser/js/customizationtopsites.json',
  };

  class BrowserPinSitesStore {
    constructor() {
      this.loadPreloadSites();
    }

    async loadPreloadSites() {
      const hasLoaded = await this.checkPreSitesloaded();
      if (hasLoaded) return;
      const preloadSites = await this.getJSON(preloadPath.preloadTopSites);
      const cusPreloadSites = await this.getJSON(preloadPath.preloadCustomizationTopSites);
      const combinedPreloadSites = cusPreloadSites ? preloadSites.concat(cusPreloadSites) : preloadSites;
      await this.setPinSites(combinedPreloadSites);
      asyncStorage.setItem(PRESITES_LOADED_KEY, true);
    }

    checkPreSitesloaded() {
      return this.getItem(PRESITES_LOADED_KEY);
    }

    getJSON(input) {
      return fetch(input).then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          console.warn(`getJSON: ${input} not loaded`);
          return null;
        }
      });
    }

    getPinSites() {
      return this.getItem(PINSITES_KEY);
    }

    replace(index, data) {
      return new Promise((resolve) => {
        this.getItem(PINSITES_KEY).then((sites) => {
          sites[index] = data;
          this.setPinSites(sites).then(() => resolve());
        });
      });
    }

    setPinSites(sites) {
      return this.setItem(PINSITES_KEY, this.formatPinSites(sites));
    }

    formatPinSites(sites) {
      if (sites.length === MAX_PINSITES_NUM) {
        return sites;
      }

      const results = new Array(MAX_PINSITES_NUM);

      for (let i = 0; i < results.length; i++) {
        results[i] = sites[i];
      }

      return results;
    }

    setItem(key, value) {
      return new Promise((resolve) => {
        asyncStorage.setItem(key, value, resolve);
      });
    }

    getItem(key) {
      return new Promise((resolve) => {
        asyncStorage.getItem(key, resolve);
      });
    }
  }

  window.BrowserPinSitesStore = BrowserPinSitesStore;
})(window);
