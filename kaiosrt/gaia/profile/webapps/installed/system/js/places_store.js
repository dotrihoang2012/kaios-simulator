(function(exports) {
  const DB_NAME = 'places_idb_store';
  const DB_VERSION = 2;
  const PLACES_STORE = 'places';
  const VISITS_STORE = 'visits';

  class PlacesStore {
    constructor() {
      this._listeners = {
        change: null
      };
    }

    init() {
      return new Promise((resolve, reject) => {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = this.upgradeSchema;
        req.onsuccess = (e) => {
          this.readyState = true;
          this.db = e.target.result;
          resolve();
        };
        req.onerror = (e) => {
          if (e.target.error.name === 'QuotaExceededError') {
            typeof this.onOpenFail === 'function' &&  this.onOpenFail();
            console.error('open PlacesIdb failed: ', e.target.error);
            reject();
          }
        }
      });
    }

    upgradeSchema(e) {
      const db = e.target.result;
      const fromVersion = e.oldVersion;

      if (fromVersion < 1) {
        var places = db.createObjectStore(PLACES_STORE, { keyPath: 'url' });
        places.createIndex('frecency', 'frecency', { unique: false });
        places.createIndex('visited', 'visited', { unique: false });
      }

      if (fromVersion < 2) {
        const visits = db.createObjectStore(VISITS_STORE, { keyPath: 'date' });
        visits.createIndex('date', 'date', { unique: true });
      }
    }

    ready() {
      return new Promise((resolve) => {
        if (this.readyState) {
          resolve();
        } else {
          this.init().then(resolve);
        }
      });
    }

    put(data, store) {
      return this.ready().then(() => {
        return new Promise((resolve) => {
          const stores = store || [PLACES_STORE, VISITS_STORE];
          const txn = this.db.transaction(stores, 'readwrite');

          if (store) {
            txn.objectStore(store).put(data);
          } else {
            txn.objectStore(PLACES_STORE).put(data);

            if (!data.visits) {
              data.visits = [data.visited];
            }

            const visitsStore = txn.objectStore(VISITS_STORE);
            data.visits.forEach((date) => {
              visitsStore.put({
                date: date,
                url: data.url,
                title: data.title,
                icons: data.icons,
              });
            });
          }

          txn.oncomplete = () => {
            resolve();
            this.emmit('change');
          };
        });
      });
    }

    remove(id, store = PLACES_STORE) {
      return this.ready().then(() => {
        return new Promise((resolve) =>{
          const txn = this.db.transaction(store, 'readwrite');
          txn.objectStore(store).delete(id);
          txn.oncomplete = () => {
            resolve();
            this.emmit('change');
          };
        });
      });
    }

    clear(store) {
      return this.ready().then(() => {
        return new Promise((resolve) => {
          const stores = store || [PLACES_STORE, VISITS_STORE];
          const txn = this.db.transaction(stores, 'readwrite');
          stores.forEach((_store) => txn.objectStore(_store).clear());
          txn.oncomplete = () => {
            resolve();
            this.emmit('change');
          };
        });
      });
    }

    getPlace(url) {
      return this.ready().then(() => {
        return new Promise((resolve) => {
          const txn = this.db.transaction(PLACES_STORE, 'readonly');
          const oStore = txn.objectStore(PLACES_STORE);
          const objectStoreRequest = oStore.get(url);

          objectStoreRequest.onsuccess = () => {
            resolve(objectStoreRequest.result);
          };
        });
      });
    }

    readStore(store, index, limit, filter, merge) {
      return this.ready().then(() => {
        return new Promise((resolve) => {
          const results = [];
          const txn = this.db.transaction(store, 'readonly');
          const oStore = txn.objectStore(store);
          const mergeType = merge && merge.type || '';
          let lastMatched = '';

          oStore.index(index)
            .openCursor(null, 'prev')
            .onsuccess = (event) => {
              const cursor = event.target.result;
              if (cursor) {
                if (!filter || filter(cursor.value)) {
                  if (mergeType) {
                    const currentMatched = new URL(cursor.value.url)[mergeType];

                    if (lastMatched !== currentMatched) {
                      lastMatched = currentMatched;
                      results.push(cursor.value);
                    }
                  } else {
                    results.push(cursor.value);
                  }
                }

                if (results.length < limit) {
                  cursor.continue();
                }
              }
          };

          txn.oncomplete = () => resolve(results);
          txn.onerror = txn.onabort = () => resolve();
        });
      });
    }

    emmit(event) {
      typeof this._listeners[event] === 'function' && this._listeners[event]();
    }

    on(event, handler) {
      if (event in this._listeners) {
        this._listeners[event] = handler;
      }
    }
  }

  exports.PlacesStore = PlacesStore;
})(window);
