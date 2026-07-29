import * as utils from './utils';

const DB_NAME = 'evldb';
const STORE_NAME = 'evlactions';
const DB_VERSION = 1;
const EVENT_TYPE_IDX = 'event_type';
const DB_CAPACITY = 'db_capacity';
const PRIORITY_HIGHT = 1;
const PRIORITY_ONFULL = 2;

class EVLDB {
  constructor() {
    this.db = null;
    this.QUOTA = 2000;
    this.OVERFLOW = 50;
    this.records = 0;
    this.isFull = false;
  }

  init() {
    return new Promise((resolve, reject) => {
      var req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = this.upgradeSchema;
      req.onsuccess = (e) => {
        this.db = e.target.result;
        this._recordsCount().then(() => {
          resolve();
        })
      };
    });
  }

  upgradeSchema(e) {
    var db = e.target.result;

    utils.debug('onupgradeneeded');
    var objectStore = db.createObjectStore(STORE_NAME, { autoIncrement: true });
    objectStore.createIndex(EVENT_TYPE_IDX, EVENT_TYPE_IDX, { unique: false });
  }

  _recordsCount() {
    return new Promise((resolve, reject) => {
      var transaction = this.db.transaction([STORE_NAME], 'readonly');
      var objectStore = transaction.objectStore(STORE_NAME);
      var countRequest = objectStore.count();
      countRequest.onsuccess = () => {
        utils.debug(countRequest.result);
        this.records = countRequest.result;
        resolve(this.records);
        this.isFull = this.records >= this.QUOTA - 1;
        this.emit(DB_CAPACITY, { isFull: this.isFull });
      }
      countRequest.onerror = () => {
        utils.debug('countRequest _recordsCount error');
        reject();
      }
    })
  }

  add(obj, priority) {
    if (this.records > this.QUOTA - 1) {
      this.isFull = true;
      this.emit(DB_CAPACITY, { isFull: this.isFull });
    } else {
      this.isFull = false;
    }

    if (priority !== 1 && this.records > this.QUOTA - 1) {
      return Promise.reject({ reason: 'exceed limit', isFull: true });
    } else if (priority === 1 &&
      this.records > this.QUOTA + this.OVERFLOW - 1) {
      return Promise.reject({ reason: 'exceed limit', isFull: true });
    }

    return new Promise((resolve, reject) => {
      var transaction = this.db.transaction([STORE_NAME], 'readwrite');
      var req = transaction.objectStore(STORE_NAME).add(obj);

      req.onsuccess = e => {
        this.records += 1;
        if (this.records > this.QUOTA - 1) {
          this.isFull = true;
          this.emit(DB_CAPACITY, { isFull: this.isFull });
        }
        resolve(e.target.result);
        utils.debug('onsuccess primaryKey e.target.result ' + e.target.result);
      };
      transaction.onerror = transaction.onabort = req.onerror = (e) => {
        utils.debug('add transaction errror');
        reject(e);
      }
    });
  }

  deleteSent(pKeys) {
    utils.debug("in deleteSent");
    let in_time = Date.now();
    if (!pKeys) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      var transaction = this.db.transaction([STORE_NAME], 'readwrite');
      var objectStore = transaction.objectStore(STORE_NAME);
      var finding = [].concat(pKeys);
      var req = objectStore.openCursor(null, 'prev');
      req.onsuccess = (event) => {
        var cursor = event.target.result;
        if (cursor) {
          var idx = finding.indexOf(cursor.primaryKey);
          if (idx > -1) {
            utils.debug('deleteSent deleting cursor');
            utils.debug('cursor.primaryKey' + cursor.primaryKey);
            cursor.delete();
            finding.splice(idx, 1);
          }
          cursor.continue();
        } else {
          utils.debug('primaryKey all deleted.');
          utils.debug("out deleteSent  time consumed " + (Date.now() - in_time));
          // Update records.
          this._recordsCount().then(() => {
            resolve();
          }).catch( e => {
            resolve();
          });
        }
      };
     });
  }

  deleteRecords(pKeys) {
    utils.debug("in deleteRecords");
    let in_time = Date.now();
    if (!pKeys) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      var transaction = this.db.transaction([STORE_NAME], 'readwrite');
      var objectStore = transaction.objectStore(STORE_NAME);

      var finding = [].concat(pKeys);
      let n = 0;
      finding.forEach(pKey => {
        let req = objectStore.delete(pKey);
        req.onsuccess = () => {
          n++;
          if (finding.length == n) {
            utils.debug('primaryKey all deleted.');
            utils.debug("out deleteRecords  time consumed " + (Date.now() - in_time));
            this._recordsCount().then(() => {
              resolve();
            }).catch(() => {
              resolve();
            });
          }
        };
        req.onerror = reject;
      });
    });
  }

  // To read a group of records
  read(idx, value) {
    return new Promise((resolve, reject) => {
      if (!value) {
        resolve([]);

        return;
      }

      var transaction = this.db.transaction([STORE_NAME], 'readonly');
      var objectStore = transaction.objectStore(STORE_NAME);
      var items = [];
      var finding = [].concat(value);
      var req = objectStore.getAll();
      req.onsuccess = (event) => {
        var arr = event.target.result;
        arr.forEach(data => {
          if (data[idx] && finding.indexOf(data[idx]) > -1) {
            items.push(data);
          }
        })
        resolve(items);
      };
      req.onerror = reject;
    })
  }

  getAll() {
    return new Promise((resolve, reject) => {
      var transaction = this.db.transaction([STORE_NAME], 'readonly');
      var objectStore = transaction.objectStore(STORE_NAME);
      var req = objectStore.getAll();
      req.onerror = reject;
      req.onsuccess = (e) => {
        resolve(e.target.result);
        console.log('getAll. length = ' + e.target.result.length);
      };
    });
  }

  getPriorityWithConsent(user_consent, priority, num) {
    return new Promise((resolve, reject) => {
      let ret = { items: [], keys: [] };

      if (typeof num === 'number' && num < 1) {
        return resolve(ret);
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      var req = objectStore.openCursor(null, 'prev');
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          if (evlm.evlConfig.getPriority(cursor.value) === priority) {
            // User consent or user consent is not needed
            if (user_consent ||
              !evlm.evlConfig.consentNeeded(cursor.value)) {
              utils.debug('push records');
              ret.items.push(cursor.value);
              ret.keys.push(cursor.primaryKey);

              if (typeof num === 'number' && ret.items.length == num) {
                return resolve(ret);
              }
            }
          }

          cursor.continue();
        } else {
          utils.debug('all priority records processed');
          resolve(ret);
        }
      };
      req.onerror = reject;
    })
  }

  getAllWithConsent(user_consent, num) {
    return new Promise((resolve, reject) => {
      let ret = { items: [], keys: [] };

      if (typeof num === 'number' && num < 1) {
        return resolve(ret);
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      var req = objectStore.openCursor(null, 'prev');
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          // User consent or user consent is not needed
          if (user_consent ||
            !evlm.evlConfig.consentNeeded(cursor.value)) {
            utils.debug('push records');
            ret.items.push(cursor.value);
            ret.keys.push(cursor.primaryKey);

            if (typeof num === 'number' && ret.items.length == num) {
              return resolve(ret);
            }
          }

          cursor.continue();
        } else {
          utils.debug('all priority records processed');
          resolve(ret);
        }
      };
      req.onerror = reject;
    })
  }

  clear() {
    return new Promise((resolve, reject) => {
      var transaction = this.db.transaction([STORE_NAME], 'readwrite');
      var objectStore = transaction.objectStore(STORE_NAME);
      var req = objectStore.clear();
      req.onsuccess = () => {
        this.records = 0;
        this.isFull = false;
        resolve();
      }
      req.onerror = reject;
    });
  }

  emit(type, data) {
    var evt = new CustomEvent(type, { detail: data });
    window.dispatchEvent(evt);
  }

  setQuota(qt, ovf) {
    if (qt && !isNaN(parseInt(qt))) {
      this.QUOTA = qt;
    }
    if (ovf && !isNaN(parseInt(ovf))) {
      this.OVERFLOW = ovf;
    }
  }
}

export const evldb = new EVLDB();