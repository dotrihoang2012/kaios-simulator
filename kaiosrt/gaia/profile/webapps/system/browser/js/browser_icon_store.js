/* global LazyLoader */
class BrowserIconStore {
  constructor() {
    this.icons = [];
    this.init();
  }

  init() {
    LazyLoader.load(window.AppOrigin.getOrigin('shared') +
      '/js/helper/common/icons_helper.js')
      .then(() => {
        this.resolve && this.resolve();
        this.resolve = null;
        this.isReady = true;
      })
  }

  ready() {
    return new Promise((resolve) => {
      if (this.isReady) {
        resolve();
      } else {
        this.resolve = resolve;
      }
    });
  }

  getIcon(place) {
    if (place.url in this.icons && this.icons[place.url]) {
      return this.icons[place.url];
    }

    return this.ready().then(() => {
      return new Promise((resolve) => {
        window.IconsHelper.getIcon(place.url, null, place).then((iconUrl) => {
          this.fetchIcon(iconUrl, (err, uri) => {
            if (err) {
              return resolve(null);
            }

            this.icons[place.url] = uri;
            resolve(uri);
          });
        });
      });
    });
  }

  fetchIcon(uri, callback) {
    const xhr = new XMLHttpRequest({ mozSystem: true });
    xhr.open('GET', uri, true);
    xhr.responseType = 'blob';
    xhr.addEventListener('load', () => {
      if (!(xhr.status === 200 || xhr.status === 0)) {
        return callback(new Error('error_downloading'));
      }

      const blob = xhr.response;

      // Only save the icon if it can be loaded as an image bigger than 0px
      const img = document.createElement('img');
      img.src = window.URL.createObjectURL(blob);

      img.onload = () => {
        window.URL.revokeObjectURL(img.src);
        if (img.naturalWidth <= 0) {
          return callback(new Error('Cannot load image'));
        }
        return callback(null, uri);
      };
      img.onerror = () => {
        window.URL.revokeObjectURL(img.src);
        return callback(new Error('Cannot load image'));
      };
    });
    xhr.onerror = () => {
      return callback(new Error('Cannot load uri'));
    };

    xhr.send();
  }
}

export default new BrowserIconStore();
