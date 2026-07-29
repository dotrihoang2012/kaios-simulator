import * as utils from './utils';

const POSTPONDTIME = 5 * 1000;
const SUMMARYSTARTINGTIME = 'summary_starting_time';

class SummaryStore {
  constructor(category, defaultData) {
    this.category = category;
    this.defaultData = JSON.parse(JSON.stringify(defaultData));
    this.data = JSON.parse(JSON.stringify(defaultData));
    this.timer = 0;
    this.init();
  }

  init() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise(resolve => {
      this.load().then(data => {
        if (data) {
          this.data = data;
        }
        utils.debug('storage init' + JSON.stringify(this.data));
        resolve(this.data);
      });
    });

    return this.initPromise;
  }

  save(isPostpond = true) {
    utils.debug('save storage ', this.category);
    clearTimeout(this.timer);
    if (isPostpond) {
      this.timer = setTimeout(() => {
        try {
          asyncStorage.setItem(this.category, this.data);
        } catch (e) {
          utils.debug('Summary asyncStorage error');
          console.error('Summary asyncStorage error');
        }
      }, POSTPONDTIME);
    } else {
      try {
        asyncStorage.setItem(this.category, this.data);
      } catch (e) {
        utils.debug('Summary asyncStorage error');
        console.error('Summary asyncStorage error');
      }
    }
  }

  reset() {
    asyncStorage.removeItem(this.category);
    this.data = JSON.parse(JSON.stringify(this.defaultData));
  }

  load() {
    return Promise.all([this.loadData(),
      this.initFirstStartingTime()
    ]).then(result => {
      return Promise.resolve(result[0]);
    });
  }

  loadData() {
    return new Promise(resolve => {
      asyncStorage.getItem(this.category, data => {
        resolve(data);
      });
    })
  }

  static setNextStartingNow() {
    return new Promise((resolve, reject) => {
      try {
        asyncStorage.setItem(SUMMARYSTARTINGTIME, Date.now(), () => {
          resolve();
        });
      } catch (e) {
        console.error("Failed to save summary_starting_time");
        reject(e);
      }
    });
  }

  static getStartingTime() {
    return new Promise(resolve => {
      try {
        asyncStorage.getItem(SUMMARYSTARTINGTIME, (time) => {
          resolve(time);
        });
      } catch (e) {
        console.error("Failed to get summary_starting_time");
        resolve(0);
      }
    });
  }

  initFirstStartingTime() {
    return new Promise(resolve => {
      try {
        asyncStorage.getItem(SUMMARYSTARTINGTIME, (time) => {
          if (!time) {
            asyncStorage.setItem(SUMMARYSTARTINGTIME, Date.now(), () => {
              resolve();
            })
          } else {
            resolve();
          }
        })
      } catch (e) {
        resolve();
      }
    })
  }

}

export default SummaryStore;