/* global asyncStorage */
const STORENAME = 'browser-recent-searches';
const MAXRECORDSNUM = 10;

class BrowserRecentStore {
  getRecentRecords() {
    return new Promise((resolve) => {
      asyncStorage.getItem(STORENAME, resolve)
    });
  }

  addRecentRecord(record) {
    return new Promise((resolve) => {
      record = record.trim();

      if (record) {
        asyncStorage.getItem(STORENAME, (results) => {
          if (results) {
            const index = results.indexOf(record);

            if (index > -1) {
              results.splice(index, 1);
              results.unshift(record);
            } else if (results.length < MAXRECORDSNUM) {
              results.unshift(record);
            } else {
              results.pop();
              results.unshift(record);
            }
          } else {
            results = [record];
          }

          asyncStorage.setItem(STORENAME, results, resolve);
        });
      } else {
        resolve();
      }
    });
  }

  clear() {
    return new Promise((resolve) => {
      asyncStorage.setItem(STORENAME, [], resolve);
    });
  }
}

export default new BrowserRecentStore();
