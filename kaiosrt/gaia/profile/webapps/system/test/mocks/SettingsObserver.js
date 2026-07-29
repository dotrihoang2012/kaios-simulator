global.SettingsObserver = {
  keyMap: {}, // key: { value, callbacks: [] }
  getValue(key) {
    let value;
    if (this.keyMap[key]) {
      value = this.keyMap[key].value;
    }
    return Promise.resolve(value);
  },
  getBatch(settings) {
    let results = [];
    settings.forEach(name => {
      if (this.keyMap[name]) {
        results.push({ name, value: this.keyMap[name] });
      }
    });
    return Promise.resolve(results);
  },
  setValue(settings) {
    settings.forEach(keyValue => {
      if (this.keyMap[keyValue.name]) {
        this.keyMap[keyValue.name].value = keyValue.value;
        this.keyMap[keyValue.name].callbacks.forEach((callback) => {
          if (typeof callback === 'function') {
            callback(keyValue.value);
          }
        });
      } else {
        this.keyMap[keyValue.name] = { value: keyValue.value, callbacks: [] };
      }
    });
    return Promise.resolve();
  },
  observe(key, defaultValue, callback, observeOnly) {
    if (this.keyMap[key]) {
      if (this.keyMap[key].callbacks) {
        this.keyMap[key].callbacks.push(callback);
      } else {
        this.keyMap[key].callbacks = [callback];
      }
      if (typeof this.keyMap[key].value !== undefined) {
        if (!observeOnly) {
          callback(this.keyMap[key].value || defaultValue, key);
        }
        return;
      }
    } else {
      this.keyMap[key] = { callbacks: [callback] };
    }
    if (!observeOnly) {
      callback(defaultValue, key);
    }
  },

  unobserve(key, callback) {
    if (this.keyMap[key]) {
      const callbacks = this.keyMap[key].callbacks;
      for (let i = 0; i < callbacks.length; i++) {
        if (callbacks[i] === callback) {
          this.keyMap[key].callbacks.splice(i, 1);
          break;
        }
      }
    }
  }
};
