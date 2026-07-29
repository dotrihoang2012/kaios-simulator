

(function rootManager(exports) {
  let rootTab = null;
  let activeTab = -1;
  const isRtl = () => 'rtl' === document.dir;

  const RootManager = {
    get activeTab() {
      return activeTab;
    },
    set activeTab(index) {
      const size = getTabsSize();

      if (index < 0) {
        index = size - 1;
      } else if (index >= size) {
        index = 0;
      }

      clearAll();
      const oldActiveTab = activeTab;
      activeTab = index;
      rootTab.select(index);
      this.tabs[activeTab].classList.remove('hidden');
      if (typeof NavigationMap !== Constants.UNDEFINED) {
        NavigationMap.rootReset(index /* New active tab*/, oldActiveTab);
      }
    },

    init() {
      if (RootManager.activeTab === -1) {
        const current = document.querySelector('.current');
        this.tabs = current.querySelectorAll('.root .content');
        rootTab = document.getElementById('root-tab');
        RootManager.activeTab = 0;
      }
    },

    back() {
      this.activeTab = this.activeTab - 1;
    },

    next() {
      this.activeTab = this.activeTab + 1;
    }
  };

  function getTabsSize() {
    return RootManager.tabs.length;
  }

  function clearAll() {
    for (let i = 0; i < getTabsSize(); i++) {
      RootManager.tabs[i].classList.add('hidden');
    }
  }

  // Add the keydown event to switch the tabs
  window.addEventListener('keydown', function tabHandle(e) {
    if (NavigationMap === Constants.UNDEFINED) {
      return;
    }
    if (
      NavigationMap.currentSection === '#root' &&
      document.activeElement.type !== 'select-one'
    ) {
      // Add support to RTL
      const direction = isRtl()
        ? ['ArrowLeft', 'ArrowRight']
        : ['ArrowRight', 'ArrowLeft'];
      if (direction.indexOf(e.key) === 0) {
        RootManager.next();
      } else if (direction.indexOf(e.key) === 1) {
        RootManager.back();
      }
    }
  });

  exports.RootManager = RootManager;
})(window);
