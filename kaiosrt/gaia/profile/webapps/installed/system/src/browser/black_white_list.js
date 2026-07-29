/* global SettingsObserver, asyncStorage, UrlHelper */ 
const STORE_NAME = 'browser_black_white_list';

/**'app.browser.black_white_list' probable value is the following:
  * -1: black list enabled
  *  0: black list and white list disabled
  *  1: white list enabled
  */
const BLACK_WHITE_LIST_ENABLED = 'app.browser.black_white_list';

class BlackWhiteList {
  constructor() {
    this.blackwhitelistEnabled = '0';
    this.handleBlackWhitelist = this.handleBlackWhitelist.bind(this);
    this.observerBlackWhitelistEnabled();
    this.getList();
  }

  observerBlackWhitelistEnabled() {
    SettingsObserver.observe(
      BLACK_WHITE_LIST_ENABLED,
      '0',
      this.handleBlackWhitelist
    );
  }

  unobserveBlackWhitelist() {
    SettingsObserver.unobserve(
      BLACK_WHITE_LIST_ENABLED,
      this.handleBlackWhitelist
    );
  }

  handleBlackWhitelist(value) {
    this.blackwhitelistEnabled = value;
  }

  getList() {
    return new Promise((resolve) => {
      if (this._blackWhiteList) {
        resolve(this._blackWhiteList);
      }

      asyncStorage.getItem(STORE_NAME, (results) => {
        this._blackWhiteList = results;
        resolve(this._blackWhiteList);
      });
    });
  }

  addItem(obj, type) {
    this.getList().then(() => {
      if (!this._blackWhiteList) {
        this._blackWhiteList = {
          blackList: [],
          whiteList: []
        }
      }

      this._blackWhiteList[type].push(obj);
      asyncStorage.setItem(STORE_NAME, this._blackWhiteList);
    });
  }

  clear() {
    asyncStorage.removeItem(STORE_NAME);
  }

  isURL(url) {
    return UrlHelper.isURL(url);
  }

  /** Test example:
   * https://bugzilla.kaiostech.com
   * https://bugzilla.*.com
   */
  fuzzyMatch(oUrl, iUrl) {
    if (!this.isURL(oUrl)) {
      return false;
    }

    if (oUrl.indexOf('*') !== -1) {
      const reg = new RegExp(oUrl.replace(/[*]/g, '\\w+'), 'gi');
      return reg.test(iUrl);
    } else {
      return oUrl.includes(iUrl) || iUrl.includes(oUrl);
    }
  }

  parseURl(url) {
    if (!url.includes('://')) {
      url = 'http://' + url; 
    }

    return new URL(url).hostname;
  }


  match(iUrl) {
    if (this.blackwhitelistEnabled === '0') {
      return Promise.resolve(true);
    }

    return this.getList().then((black_white_List) => {
      if (!black_white_List) {
        return true;
      }

      let result = true;
      const blackList = [];
      const whiteList = [];

      switch (this.blackwhitelistEnabled) {
        case '-1': // browser black list been enabled
          if (!black_white_List.blackList) {
            return true;
          }

          black_white_List.blackList.map((item) => {
            blackList.push(this.parseURl(item.url));
          });
              
          result = !blackList.some((url) => this.fuzzyMatch(url, iUrl));
          break;
        case '0': // browser black-white list been disabled
          result = true;
          break;
        case '1': // browser white list been enabled
          if (!black_white_List.whiteList) {
            return false;
          }

          black_white_List.whiteList.map((item) => {
            whiteList.push(this.parseURl(item.url));
          });

          result = whiteList.some((url) => this.fuzzyMatch(url, iUrl));
          break;
        default:
          break;
      }

      return result;
    });
  }
}

export default new BlackWhiteList();