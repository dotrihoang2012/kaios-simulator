
/* eslint prefer-destructuring: ["error", {AssignmentExpression: {array: false}}] */
(function (exports) { //eslint-disable-line
  const CACHE_VERSION = '1.0.01';

  const settingsCache = {
    saveRootContent: function saveRootContent() {
      const header = document.querySelector('#root gaia-header h1');
      const headerTextContent = header.textContent;
      const tabs = document.querySelectorAll('#root-tab span');
      let tabTextContent = '';
      for (let i = 0; i < tabs.length && i < 3; i++) {
        tabTextContent += `,${tabs[i].textContent}`;
      }

      const spans = document.querySelectorAll(
        '#root>.root>.content span[data-l10n-id]'
      );
      let itemTextContent = '';
      for (let i = 0; i < spans.length && i < 8; i++) {
        itemTextContent += `,${spans[i].textContent}`;
      }

      const textContent = `${headerTextContent}${tabTextContent}${itemTextContent}`;
      localStorage.setItem(`cache_root`, textContent);
    },

    saveSettingsCache: function saveSettingsCache() {
      const obj = {};
      obj.version = CACHE_VERSION;
      obj.language = navigator.language;
      obj.direction = document.documentElement.dir;
      obj.on = l10n.get('on');
      obj.off = l10n.get('off');
      obj.select = l10n.get('select');
      localStorage.setItem('common_info', JSON.stringify(obj));
      this.saveRootContent();
    },

    restoreSettingsCache: function restoreSettingsCache() {
      const commonInfo = this.getCommonInfo();
      if (!commonInfo) {
        return false;
      }

      document.dir = commonInfo.direction;
      const softKey = document.getElementById('fakeSoftKeyPanel');
      softKey.querySelector('#software-keys-center').textContent =
        commonInfo.select;
      if (
        commonInfo.language !== navigator.language ||
        commonInfo.version !== CACHE_VERSION
      ) {
        return false;
      }

      const value = localStorage.getItem('cache_root') || '';
      const contentParts = value.split(',');

      const header = document.querySelector('#root gaia-header h1');
      header.textContent = contentParts[0];

      const tabs = document.querySelectorAll('#root-tab span');
      tabs[0].textContent = contentParts[1];
      tabs[1].textContent = contentParts[2];
      tabs[2].textContent = contentParts[3];

      const spans = document.querySelectorAll(
        '#root>.root>.content span[data-l10n-id]'
      );
      for (let i = 0; i < 9 && 7 + i < contentParts.length; i++) {
        spans[i].textContent = contentParts[4 + i];
      }
      return true;
    },

    getCommonInfo: function getCommonInfo() {
      const value = localStorage.getItem('common_info');
      if (value) {
        const obj = JSON.parse(value);
        if (
          obj.language !== navigator.language ||
          obj.version !== CACHE_VERSION
        ) {
          return false;
        }
        return obj;
      }
      return false;
    }
  };
  exports.SettingsCache = settingsCache;
})(window);
