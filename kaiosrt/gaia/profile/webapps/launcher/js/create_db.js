class CreateDB {
  constructor(name, version, indexKey) {
    this.name = name;
    this.version = version;
    this.indexKey = indexKey;
    this.storageDB = null;
  }

  withStore(name, type) {
    return new Promise((resolve, reject) => {
      if (!this.storageDB) {
        const dbRequest = indexedDB.open(name, this.version);

        dbRequest.onsuccess = () => {
          this.storageDB = dbRequest.result;
          resolve(this.storageDB.transaction(name, type).objectStore(name));
        };
        dbRequest.onerror = () => {
          reject();
        };
        dbRequest.onupgradeneeded = () => {
          if (!dbRequest.result.objectStoreNames.contains(name)) {
            const objStore = dbRequest.result.createObjectStore(
              name,
              { autoIncrement: true }
            );
            objStore.createIndex(this.indexKey, this.indexKey);
          }
        };
      } else {
        resolve(this.storageDB.transaction(name, type).objectStore(name));
      }
    });
  }

  getAll() {
    return new Promise((resolve, reject) => {
      this.withStore(this.name, 'readonly')
        .then((store) => {
          const getAllRequest = store.getAll();
          getAllRequest.onsuccess = (evt) => {
            resolve(evt.target.result);
          };
          getAllRequest.onerror = () => reject();
        })
        .catch(() => {
          reject();
          console.error('GetAll indexDB error!');
        });
    });
  }

  get(name) {
    return new Promise((resolve, reject) => {
      this.withStore(this.name, 'readonly')
        .then((store) => {
          const indexRequest = store.index(this.indexKey);
          const getRequest = indexRequest.get(name);
          getRequest.onsuccess = (evt) => resolve(evt.target.result);
          getRequest.onerror = () => reject();
        })
        .catch(() => {
          reject();
          console.error('Get indexDB error!');
        });
    });
  }

  add(option, key) {
    return new Promise((resolve, reject) => {
      this.withStore(this.name, 'readwrite')
        .then((store) => {
          const addRequest = store.add(option, key);
          addRequest.onsuccess = (evt) => resolve(evt.target.result);
          addRequest.onerror = () => reject();
        })
        .catch(() => {
          reject();
          console.error('Add indexDB error!');
        });
    });
  }

  update(option, key) {
    return new Promise((resolve, reject) => {
      this.withStore(this.name, 'readwrite')
        .then((store) => {
          const updateRequest = store.put(option, key);
          updateRequest.onsuccess = (evt) => resolve(evt.target.result);
          updateRequest.onerror = () => reject();
        })
        .catch(() => {
          reject();
          console.error('Update indexDB error!');
        });
    });
  }

  remove(key) {
    return new Promise((resolve, reject) => {
      this.withStore(this.name, 'readwrite')
        .then((store) => {
          const removeRequest = store.delete(key);
          removeRequest.onsuccess = (evt) => resolve(evt.target.result);
          removeRequest.onerror = () => reject();
        })
        .catch(() => {
          reject();
          console.error('Remove indexDB error!');
        });
    });
  }
}
