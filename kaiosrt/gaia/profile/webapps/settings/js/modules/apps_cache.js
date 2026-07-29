
define([],() => {
  const AppsCache = function AppsCache() {
    this.initPromise = null;
    this.appsList = [];
  };

  function findIconItem(iconList, preferredSize = 56) {
    return iconList.find(
      item => item.sizes === `${preferredSize}x${preferredSize}`
    );
  }

  function getIconURL(app, iconList, options = { preferredSize: 56 }) {
    if (!iconList) {
      return Promise.resolve('../style/images/default.png');
    }
    return new Promise(resolve => {
      const { preferredSize } = options;
      const iconItem = findIconItem(iconList, preferredSize);
      const iconUrl = iconItem && iconItem.src;

      if (!iconUrl) {
        resolve('../style/images/default.png');
        return;
      }
      const url = app.manifestUrl.split('/');
      if (iconUrl.startsWith(url[0])) {
        resolve(iconUrl);
      } else {
        resolve(`${url[0]}//${url[2]}${iconUrl}`);
      }
    });
  }

  AppsCache.prototype = {
    getAppManifest(app) {
      return new Promise(res => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', app.manifestUrl);
        xhr.send();
        xhr.onload = () => {
          try {
            app.manifest = JSON.parse(xhr.response);
            getIconURL(app, app.manifest.icons).then(value => {
              app.manifest.iconUrl = value;
            });
            // eslint-disable-next-line
            app.origin = app.origin || app.manifestUrl.split('/' + AppOrigin.getManifestName())[0];
            if (app.manifest.b2g_features) {
              // eslint-disable-next-line
              for (let member in app.manifest.b2g_features) {
                app.manifest[member] = app.manifest.b2g_features[member];
              }
            }
            res(app);
          } catch (e) {
            res();
          }
        };
        xhr.onerror = () => {
          res();
        };
      });
    },

    apps: function apps() {
      return this.init().then(() => this.appsList);
    },

    init: function init() {
      if (!this.initPromise) {
        this.initPromise = this.initApps().then(() => {
          this.initEvents();
        });
      }
      return this.initPromise;
    },

    updateManifest: function updateManifest() {
      DebugHelper.debug(
        `Language changed / appsList length: ${this.appsList.length}`
      );
      this.appsList.forEach(app => {
        this.getAppManifest(app);
      });
    },

    initEvents: function initEvents() {
      window.addEventListener('localized', this.updateManifest.bind(this));
      ApiManager.apps.addEventListener('appInstalled', evt => {
        const installedApp = evt.application;
        installedApp.ondownloadapplied = () => {
          if (
            !this.appsList.some(app => {
              return app.manifestURL === installedApp.manifestURL;
            })
          ) {
            this.appsList.push(installedApp);
            window.dispatchEvent(
              new CustomEvent('APPs-appInstalled', {
                detail: { app: installedApp }
              })
            );
          }
        };
        installedApp.ondownloaderror = () => {
          DebugHelper.debug('App download fail.');
        };
      });
      ApiManager.apps.addEventListener('appUninstalled', evt => {
        const { manifestURL } = evt.application;

        let removedAppIndex = null;
        for (let i = this.appsList.length - 1; i >= 0; i--) {
          if (this.appsList[i].manifestURL === manifestURL) {
            removedAppIndex = i;
            break;
          }
        }
        this.appsList.slice(removedAppIndex, 1);
        if (removedAppIndex) {
          window.dispatchEvent(
            new CustomEvent('APPs-appUninstalled', {
              detail: { app: evt.application }
            })
          );
        }
      });
      // ApiManager.apps.addEventListener('appUpdated', callback);
    },

    initApps: function initApps() {
      const promise = new Promise((resolve, reject) => {
        ApiManager.apps.getAll().then(
          apps => {
            const appsPromise = [];
            apps.forEach(app => {
              DebugHelper.debug(`app:${JSON.stringify(app)}`);
              appsPromise.push(this.getAppManifest(app));
            });
            Promise.all(appsPromise).then(appResults => {
              appResults.forEach(app => {
                if (app) {
                  this.appsList.push(app);
                }
              });
              resolve(this.appsList);
            });
          },
          err => {
            DebugHelper.debug('failed to get installed apps');
            reject(err);
          }
        );
      });
      return promise;
    }
  };

  const appsCache = new AppsCache();
  appsCache.init();
  return appsCache;
});
