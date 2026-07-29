class Emitter {
  on(type, callback) {
    if (!this._callbacks) this._callbacks = {};
    if (!this._callbacks[type]) this._callbacks[type] = [];
    this._callbacks[type].push(callback);
    return this;
  }

  off(...args) {
    if (this._callbacks) {
      switch (args.length) {
        case 0:
          this._callbacks = {};
          break;
        case 1:
          delete this._callbacks[args[0]];
          break;
        default: {
          const typeListeners = this._callbacks[args[0]];
          if (!typeListeners) return;
          const i = typeListeners.indexOf(args[1]);
          i > -1 && typeListeners.splice(i, 1);
        }
      }
    }

    return this;
  }

  once() {}

  emit(type, data) {
    if (this._callbacks) {
      let fns = this._callbacks[type] || [];
      fns = fns.concat(this._callbacks['*'] || []);

      for (let i = 0; i < fns.length; i++) {
        fns[i].call(this, data, type);
      }
    }

    return this;
  }
}

export default new Emitter;
