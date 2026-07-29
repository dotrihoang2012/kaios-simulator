

(function navigationMap(exports) {
  const MenuMap = {
    MENU_ID_BASE: 1000,
    optionsShow: false,
    storeFocused: null
  };
  const NavigationMap = {
    controlList: null,
    itemsBaseId: 0,
    currentSection: null,
    previousSection: null,
    pageFocusIdMap: [],
    rootPageIdMap: [],
    currentActivatedLength: 0, // It used for confirm dialog.
    selectOptionShow: false,
    statusbarHeight: 26,
    softkeybarHeight: 30,
    ignoreTypes: ['tel', 'text', 'password'],

    init: function init() {
      DebugHelper.log('NavigationMap init');
      NavigationMap.updateHeight();
      NavigationMap.addEventForMenuOptions();

      if (SettingsDBCache.getInitComplete()) {
        SettingsDBCache.observe(
          'selectOptionPopup.state',
          false,
          value => {
            NavigationMap.selectOptionChange(value);
          },
          true
        );
      } else {
        window.addEventListener(
          'settings-db-ready',
          () => {
            SettingsDBCache.observe(
              'selectOptionPopup.state',
              false,
              value => {
                NavigationMap.selectOptionChange(value);
              },
              true
            );
          },
          { once: true }
        );
      }

      window.addEventListener('panelready', e => {
        NavigationMap.currentSection = e.detail.current;
        NavigationMap.previousSection = e.detail.previous
          ? e.detail.previous
          : null;
        NavigationMap.menuReset(e.detail.needFocused, true);
        window.dispatchEvent(
          new CustomEvent('panelComplete', {
            detail: {
              panelId: e.detail.current
            }
          })
        );
      });

      window.addEventListener('refresh', NavigationMap.refresh);

      document.addEventListener('focusChanged', evt => {
        const input = evt.detail.focusedElement.querySelector('input');
        if (input && NavigationMap.ignoreTypes.indexOf(input.type) > -1) {
          input.focus();
        }
      });

      window.addEventListener('keydown', evt => {
        if (
          document.activeElement.type === 'select-one' ||
          NavigationMap.currentActivatedLength > 0
        ) {
          return;
        }
        if (evt.key === 'Backspace') {
          let handled = true;
          switch (Settings.getCurrentPanel()) {
            case '#root':
              // Do nothing
              handled = false;
              break;
            default:
              if (SettingsSoftkey.menuVisible()) return;
              if (MenuMap.optionsShow === false) {
                NavigationMap.navigateBack();
              }
          }
          if (handled) {
            evt.preventDefault();
          }
        } else if (evt.key === 'Enter') {
          const selectorRule =
            'li:not([aria-disabled="true"]).focus select:not(.no-open)';
          const select = document.querySelector(selectorRule);
          if (select && select.hasChildNodes()) {
            select.focus();
          }
        }
      });
      window.dispatchEvent(new CustomEvent('navigation-map-init'));
    },

    updateHeight: function updateHeight() {
      const style = window.getComputedStyle(document.body);
      const fontSize = style.getPropertyValue('font-size');
      const statusHeight = style.getPropertyValue('--statusbar-height');
      const softkeyHeight = style.getPropertyValue('--softkeybar-height');
      this.statusbarHeight = parseFloat(statusHeight) * parseFloat(fontSize);
      this.softkeybarHeight = parseFloat(softkeyHeight) * parseFloat(fontSize);
    },

    rootReset: function rootReset(newActiveTab, oldActiveTab) {
      const panel = document.querySelector('#root');
      const focusElement = panel.querySelector('.focus');
      let navId = null;
      if (focusElement) {
        navId = focusElement.getAttribute('data-nav-id');
      }
      const id = this.findFocusedId(navId);
      let haveId = 0;
      const { length } = this.rootPageIdMap;
      if (length) {
        this.rootPageIdMap.push({
          newActiveTab,
          oldActiveTab,
          navId: id
        });
        haveId++;
      }
      for (let i = 0; i < length; i++) {
        const pageInfo = this.rootPageIdMap[i];
        if (
          pageInfo.newActiveTab === newActiveTab &&
          pageInfo.oldActiveTab === oldActiveTab
        ) {
          haveId++;
          if (pageInfo.navId !== id) {
            pageInfo.navId = id;
          }
        }
      }
      if (haveId === 0) {
        this.rootPageIdMap.push({
          newActiveTab,
          oldActiveTab,
          navId: id
        });
      } else {
        haveId = 0;
      }
      this.controlList = document.querySelectorAll(
        '.current div:not(.hidden) > ul:not(.hidden) >li:not(.hidden)'
      );
      if (this.controlList.length === 0) return;

      const focusElements = document.querySelectorAll('.focus');
      if (focusElements.length > 0) {
        focusElements.forEach(element => {
          element.classList.remove('focus');
        });
      }

      this.controlList[0].setAttribute('tabindex', 1);
      this.controlList[0].classList.add('focus');
      if (!NavigationMap.selectOptionShow) {
        this.controlList[0].focus();
      }
      this.scrollToElement(this.controlList[0]);
      this.update();
    },

    // Refresh current page and make the new element can be focused.
    refresh: function refresh() {
      if (
        typeof Settings === Constants.UNDEFINED ||
        !Settings.getCurrentPanel()
      ) {
        return;
      }
      // We do not need refresh panel if panel can't ready
      if (Settings.getCurrentPanel() !== NavigationMap.currentSection) {
        return;
      }
      NavigationMap.controlList = document
        .querySelector(Settings.getCurrentPanel())
        .querySelectorAll(
          'div:not(.hidden) > ul:not(.hidden) >li:not(.hidden):not(.non-focus)'
        );

      if (NavigationMap.controlList.length === 0) {
        DebugHelper.debug('Nothing dislay on thing panel');
        return;
      }

      const initial = NavigationMap.controlList[0]; // eslint-disable-line
      initial.setAttribute('tabindex', 1);

      const focused = document
        .querySelector(NavigationMap.currentSection)
        .querySelectorAll(
          'div:not(.hidden) > ul:not(.hidden) >li:not(.hidden):not(.non-focus).focus'
        );
      if (focused.length > 0) {
        NavigationMap.scrollToElement(focused[0], false);
        for (let i = 1; focused.length > i; i++) {
          focused[i].classList.remove('focus');
        }
      } else {
        initial.classList.add('focus');
        initial.focus();
        NavigationMap.scrollToElement(initial);
        document.dispatchEvent(
          new CustomEvent('focusChanged', {
            detail: {
              focusedElement: initial
            }
          })
        );
      }

      NavigationMap.update();
    },

    updateFocus: function updateFocus(panel, needFocused) {
      this.controlList = panel.querySelectorAll(
        'div:not(.hidden) > ul:not(.hidden) >li:not(.hidden):not(.non-focus)'
      );
      const focusedElement = panel.querySelector('.focus');
      if (focusedElement) {
        focusedElement.classList.remove('focus');
      }

      const initial = needFocused;
      initial.setAttribute('tabindex', 1);
      initial.classList.add('focus');
      initial.focus();
      this.scrollToElement(initial, false);
      document.dispatchEvent(
        new CustomEvent('focusChanged', {
          detail: {
            focusedElement: initial
          }
        })
      );
      this.update();
    },

    menuReset: function menuReset(needFocused, flag) {
      let initial = null;
      const currentSection = document.querySelector(
        NavigationMap.currentSection
      );
      this.controlList = currentSection.querySelectorAll(
        'div:not(.hidden) > ul:not(.hidden) >li:not(.hidden):not(.non-focus)'
      );

      if (
        NavigationMap.previousSection ||
        NavigationMap.currentSection !== '#root'
      ) {
        const navId = this.findNaviId(
          NavigationMap.previousSection,
          NavigationMap.currentSection,
          flag
        );

        const focused = document.querySelectorAll('.focus');
        if (focused.length > 0) {
          focused[0].classList.remove('focus');
        }

        let hasLiElement = true;
        if (this.controlList.length === 0) {
          hasLiElement = false;
          this.controlList = currentSection.querySelectorAll(
            'div:not(.hidden)'
          );
        }
        const id = this.findFocusedId(navId);

        initial = this.controlList[id];
        if (needFocused) {
          initial = needFocused;
        }
        initial.setAttribute('tabindex', 1);
        if (hasLiElement) {
          initial.classList.add('focus');
        }
        initial.focus();
      } else {
        initial = document.querySelector('.focus');
      }

      this.scrollToElement(initial, false);
      document.dispatchEvent(
        new CustomEvent('focusChanged', {
          detail: {
            focusedElement: initial
          }
        })
      );
      this.update();
    },

    update: function update() {
      console.log('NavigationMap update');

      let i = 0;
      for (i = 0; i < this.controlList.length; i++) {
        this.controlList[i].setAttribute('data-nav-id', this.itemsBaseId);
        this.controlList[i].style.setProperty(
          '--nav-down',
          this.itemsBaseId + 1
        );
        this.controlList[i].style.setProperty('--nav-up', this.itemsBaseId - 1);
        this.controlList[i].setAttribute('tabindex', 0);
        this.itemsBaseId++;
      }

      this.controlList[this.controlList.length - 1].style.setProperty(
        '--nav-down',
        this.itemsBaseId - this.controlList.length
      );
      this.controlList[0].style.setProperty('--nav-up', this.itemsBaseId - 1);
    },

    // Get focused id of target panel
    findNaviId: function findNaviId(currentPanel, targetPanel, flag) {
      if (currentPanel === null) {
        return 0;
      }

      let focusId = 0;
      const { length } = this.pageFocusIdMap;

      // Check current operation is openning new panel or backing  previous panel according to key
      for (let i = 0; i < length; i++) {
        const info = this.pageFocusIdMap[i];
        if (
          currentPanel + targetPanel === info.key ||
          targetPanel + currentPanel === info.key
        ) {
          // A key exist, it's backing operation
          focusId = info.focusId; // eslint-disable-line
          if (flag) {
            this.pageFocusIdMap.splice(i, 1);
          }
          return focusId;
        }
      }

      // Key not exist, open a new panel
      console.log(
        `***open new page operation, previous panel --> ${currentPanel}`
      );
      const pagesIdString = currentPanel + targetPanel;
      const panel = document.querySelector(currentPanel);
      if (panel.querySelector('.focus') === null) {
        return -1;
      }
      const navId = panel.querySelector('.focus').getAttribute('data-nav-id');
      console.log(`***previous panel focus navi id --> ${navId}`);
      this.pageFocusIdMap.push({
        key: pagesIdString,
        focusId: navId
      });
      return focusId;
    },

    // Get focused element id
    findFocusedId: function findFocusedId(navId) {
      let id = 0;
      if (this.controlList) {
        for (let i = 0, len = this.controlList.length; i < len; i++) {
          if (this.controlList[i].getAttribute('data-nav-id') === navId) {
            id = i;
            break;
          }
        }
      }
      return id;
    },

    // Calculate the height of gaia-header/softkey/rootTab
    getHeaderPanelHeight() {
      let headerHeight = 0;
      let softPanelHeight = 0;
      let rootTabHeight = 0;
      let curPanel = null;
      if (typeof Settings !== 'undefined') {
        curPanel = document.querySelector(Settings.getCurrentPanel());
      } else {
        curPanel = document.querySelector('#root');
      }
      if (curPanel) {
        const header = curPanel.querySelector('gaia-header');
        if (header) {
          headerHeight = header.clientHeight;
        }
        softPanelHeight = this.softkeybarHeight;
        if (curPanel.id === 'root') {
          const rootContent = curPanel.querySelector('div.root');
          rootTabHeight =
            document.documentElement.clientHeight -
            rootContent.clientHeight -
            headerHeight;
        } else {
          rootTabHeight = this.statusbarHeight;
        }
      }
      return {
        header: headerHeight,
        softkey: softPanelHeight,
        rootTab: rootTabHeight
      };
    },

    scrollToElement(el, evt) {
      function isVisible(element) {
        if (element.offsetWidth === 0 || element.offsetHeight === 0) {
          return false;
        }
        const deltaHeight = NavigationMap.getHeaderPanelHeight();
        const height =
            document.documentElement.clientHeight - deltaHeight.softkey,
          rects = el.getClientRects();
        for (let i = 0, l = rects.length; i < l; i++) {
          const r = rects[i];
          let inView = false;
          if (
            r.bottom >= deltaHeight.header &&
            r.bottom <= height &&
            r.top >= deltaHeight.header + deltaHeight.rootTab
          ) {
            inView = true;
          }
          if (inView) {
            return true;
          }
        }
        return false;
      }
      // No matter is element visible or not , we should force scroll it in case its the first/last one
      const checkEdge = this.checkElement(el);
      if (checkEdge.match) {
        if (checkEdge.top) el.scrollIntoView(false);
        else el.scrollIntoView(true);
      } else if (!isVisible(el)) {
        if (evt) {
          if (
            evt.key === 'ArrowDown' ||
            el.getAttribute('data-nav-id') === '0'
          ) {
            el.scrollIntoView(false);
          } else if (evt.key === 'ArrowUp') {
            el.scrollIntoView(true);
          }
        } else {
          el.scrollIntoView(false);
        }
      }
    },
    // Check is the element on the first/last position
    checkElement(element) {
      let match = false;
      let top = false;
      const elmStyle = element.style;
      const navId = parseInt(element.dataset.navId, 10);
      const navUpId = parseInt(elmStyle.getPropertyValue('--nav-up'), 10);
      const navDownId = parseInt(elmStyle.getPropertyValue('--nav-down'), 10);
      if (navId <= navUpId) {
        match = true;
        top = true;
      } else if (navId >= navDownId) {
        match = true;
        top = false;
      }
      return {
        match,
        top
      };
    },

    selectOptionChange: function selectOptionChange(value) {
      if (value === 1) {
        NavigationMap.selectOptionShow = true;
      } else {
        NavigationMap.selectOptionShow = false;
        const focusedLi = document.querySelector('li.focus');
        if (focusedLi) {
          focusedLi.focus();
        }
      }
    },

    navigateBack: function navigateBack() {
      let preSection = null;
      const header = document.querySelectorAll('.current [data-href]');
      if (header.length > 0) {
        preSection = header[0].getAttribute('data-href');
      }
      if (preSection !== null) {
        Settings.isBackHref = true;
        Settings.setCurrentPanel(preSection);
      }
    },

    // The following code is about option menu, it that handled by components, it will be removed.
    addEventForMenuOptions: function addEventForMenuOptions() {
      window.addEventListener('menuEvent', e => {
        if (e.detail.menuVisible === true) {
          MenuMap.optionsShow = true;
        } else {
          MenuMap.optionsShow = false;
        }
      });
      NavigationMap.observerInit();
    },

    observerInit: function observerInit() {
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (
            mutation.attributeName === 'class' &&
            mutation.target.classList.contains('group-menu')
          ) {
            if (mutation.target.classList.contains('visible')) {
              MenuMap.storeFocused = document.querySelectorAll('.focus');
              MenuMap.storeFocused[0].classList.remove('focus');
              MenuMap.storeFocused[0].classList.add('focus1');

              NavigationMap.menuNavReset();
            } else if (MenuMap.storeFocused) {
              // Menu is closed
              const temp = NavigationMap.getParents(
                MenuMap.storeFocused[0],
                'section'
              );
              if (!('hidden' in temp.attributes)) {
                MenuMap.storeFocused[0].classList.remove('focus1');
                MenuMap.storeFocused[0].classList.add('focus');
                MenuMap.storeFocused[0].focus();
              }
            }
          }
        });
      });
      observer.observe(document.body, {
        attributes: true,
        characterData: true,
        subtree: true
      });
    },

    /* Group menu*/
    menuNavReset: function menuNavReset() {
      /*
       *Document.querySelector('#search .focus');menu-button
       *this.controlList = document.querySelectorAll('menu button');
       */
      this.controlList = document.querySelectorAll('.menu-button');
      if (this.controlList.length === 0) {
        return;
      }
      const focused = document.querySelectorAll('.focus');
      if (focused.length > 0) {
        focused[0].classList.remove('focus');
      }
      this.controlList[0].setAttribute('tabindex', 1);
      this.controlList[0].classList.add('focus');

      this.controlList[0].focus();

      this.menuNavUpdate();
    },

    menuNavUpdate: function menuNavUpdate() {
      let i = 0;
      let id =
        MenuMap.MENU_ID_BASE; /* To avoid 'data-nav-id' reproduced with grid*/
      for (i = 0; i < this.controlList.length; i++) {
        this.controlList[i].setAttribute('data-nav-id', id);
        this.controlList[i].style.setProperty('--nav-down', id + 1);
        this.controlList[i].style.setProperty('--nav-up', id - 1);
        this.controlList[i].setAttribute('tabindex', 0);
        id++;
      }
      // Top element
      this.controlList[0].style.setProperty('--nav-up', id - 1);
      // Bottom element
      this.controlList[this.controlList.length - 1].style.setProperty(
        '--nav-down',
        MenuMap.MENU_ID_BASE
      );
    },

    getParents(node, tagName) {
      console.log('find parent');
      const parent = node.parentNode;
      const tag = tagName.toUpperCase();
      if (parent.tagName === tag) {
        return parent;
      }
      return this.getParents(parent, tag);
    }
  };

  exports.MenuMap = MenuMap;
  exports.NavigationMap = NavigationMap;
})(window);
