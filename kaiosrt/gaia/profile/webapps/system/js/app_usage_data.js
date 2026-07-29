/* global applications, SettingsObserver, asyncStorage, AppsManager */
/*
 * A helper class that holds (and persists) a batch of app usage data
 */
(function(exports) {
  'use strict';

  const PERSISTENCE_KEY = 'metrics.app_usage.data.v2';

  const INSTALL = 2000;
  const UNINSTALL = 2010;
  const UPDATE = 2020;
  const PREINSTALL = 2030;
  const APPOPENED = 2040;
  const APPCRASHED = 2050;

  const STATUS_SUCCESS = 999;

  function UsageData(persistenceKey) {
    this.data = {
      start: Date.now(),
      apps: {}, // Maps app URLs to usage data
      searches: {},
      actions: [],
      impActions:[]
    };

    this._DEBUG = false;

    this.persistenceKey = (persistenceKey) ? persistenceKey : PERSISTENCE_KEY;
    this.needsSave = false;
    // Record the relative start time, which we can use to adjust
    // this.data.start if we get a timechange event.
    this.relativeStartTime = performance.now();
  }

  // This logging function is the only thing that is not exposed through
  // the AppUsageMetrics contstructor or its instance.
  UsageData.prototype.debug = function debug(...args) {
    if (this._DEBUG) {
      args.unshift('[UsageData]');
      console.log.apply(console, args);
    }
  }

  /*
   * Get app usage for the current date
   */
  UsageData.prototype.getAppUsage = function(manifestUrl, dayKey) {
    var usage = this.data.apps[manifestUrl];
    dayKey = dayKey || this.getDayKey();

    // We lazily initialize both the per-app and per-day usage maps
    if (!usage) {
      this.data.apps[manifestUrl] = usage = {};
    }

    var dayUsage = usage[dayKey];
    if (!dayUsage) {
      dayUsage = usage[dayKey] = {
        usageTime: 0,
        invocations: 0,
        crashed: 0,
        activities: {}
      };
      this.data.apps[manifestUrl] = usage;
    }
    return dayUsage;
  };

  UsageData.prototype.getDayKey = function(date) {
    date = date || new Date();
    var dayKey = date.toISOString().substring(0, 10);
    return dayKey.replace(/-/g, '');
  };

  UsageData.prototype.getSearchCounts = function(provider) {
    var search = this.data.searches[provider];
    var dayKey = this.getDayKey();
    if (!search) {
      // If no usage exists for this provider, create a new empty object for it.
      this.data.searches[provider] = search = {};
      this.debug('creating new object for provider', provider);
    }

    var daySearch = search[dayKey];
    if (!daySearch) {
      daySearch = search[dayKey] = {
        count: 0
      };
    }
    return daySearch;
  };

  UsageData.prototype.getAction = function(app, device, id, status) {
    let self = this;
    return new Promise(function(resolve) {
      window.asyncStorage.getItem(app.manifestUrl, (value) => {
        let appInfo = JSON.parse(value);
        let manifest = app.manifest || app.updateManifest;
        self.debug(' manifest ::' + manifest);
        let last_version;
        let appAction;
        let isSilent = appInfo ? appInfo.isSilent : false;
        let version = manifest ? manifest.version : null;
        self.debug('recordUpdate :: AppInfo:: ', value);
        self.debug('recordUpdate :: isSilent:: ', isSilent);
        switch (id) {
          case UPDATE:
            last_version = appInfo.version;
            appAction = {
              'app_id': app.manifestUrl,
              'app_version': version,
              'last_version': last_version,
              'is_silent': isSilent
            };
            break
          case APPOPENED:
            appAction = {
              'app_id': app.manifestUrl,
              'app_usage': self.getAppUsage(app.manifestUrl),
              'app_version': version,
              'is_silent': isSilent
            };
            break;
          default:
            appAction = {
              'app_id': app.manifestUrl,
              'app_version': version,
              'is_silent': isSilent
            };
            break;
        }
        let action = {
          'action_id': id,
          'status': status,
          'time': Date.now(),
          'build_id': device['platform_build_id'],
          'software': device['software'],
          'app': appAction
        };
        resolve(action);
      });
    });
  }

  UsageData.prototype.startTime = function() {
    return this.data.start;
  };

  UsageData.prototype.isEmpty = function() {
    return Object.keys(this.data.apps).length === 0 ||
           this.data.actions.length === 0;
  };

  UsageData.prototype.impAction = function() {
    return this.data.impActions;
  };

  UsageData.prototype.emptyImpActions = function (list) {
    if (!list) {
      this.data.impActions = [];
      return;
    }
    list.forEach((element) => {
      if (this.data.impActions.includes(element)) {
        this.data.impActions.splice(this.data.impActions.indexOf(element), 1);
      }
    });
  };

  // We only care about recording certain kinds of apps:
  // - Apps pre-installed with the phone (certified, or using a gaia origin)
  // - Apps installed from the marketplace
  UsageData.prototype.shouldTrackApp = function(app) {
    if (!app) {
      return false;
    }

    // Bug 1134998: Don't track apps that are marked as private windows
    // Some app-like objects may not have the isPrivateBrowser function,
    // so we also check to make sure it exists here.
    if (typeof app.isPrivateBrowser === 'function' && app.isPrivateBrowser()) {
      return false;
    }

    // Gecko and the app window state machine do not send certain app properties
    // along in webapp-launch or appopened events, causing marketplace app usage
    // to not be properly recorded. We fall back on the system app's application
    // cache in these situations. See Bug 1137063
    var cachedApp = applications.getByManifestURL(app.manifestUrl);
    var manifest = app.manifest || app.updateManifest;
    if (!manifest && cachedApp) {
      manifest = cachedApp.manifest || cachedApp.updateManifest;
    }

    if (manifest && manifest.core) {
      return true;
    }

    try {
      var url = new URL(app.manifestUrl);
      return url.hostname.indexOf(`.${window.AppOrigin.getRootDomain()}`) >= 0;
    } catch (e) {
      return false;
    }
  };

  UsageData.prototype.recordInvocation = function(app, device, time) {
    if (!this.shouldTrackApp(app)) {
      return false;
    }

    // Convert time to seconds and round to the nearest second.  If 0,
    // don't record anything. (This can happen when we go to the
    // lockscreen right before sleeping, for example.)
    time = Math.round(time / 1000);
    if (time > 0) {
      var usage = this.getAppUsage(app.manifestUrl);
      usage.invocations++;
      usage.usageTime += time;
      this.needsSave = true;
      this.debug(app, 'ran for', time);
      let self = this;
      this.getAction(app, device, APPOPENED, STATUS_SUCCESS).then((action)=>{
        self.data.actions.push(action);
        self.needsSave = true;
      });
    }
    return time > 0;
  };

  UsageData.prototype.recordSearch = function(provider) {
    this.debug('recordSearch', provider);

    if (provider == null) {
      return;
    }

    // We don't want to report search metrics for local search and any other
    // situation where we might be offline.  Check this here as this may change
    // in the future.
    if (window.isOnline()) {
      var search = this.getSearchCounts(provider);
      search.count++;
      this.needsSave = true;
      this.debug('Search Count for: ' + provider + ': ', search.count);
    }
  };

  UsageData.prototype.recordPreinstall = function(device) {
    AppsManager.getAll().then((apps) => {
      let self = this;
      for (let app of apps) {
        this.getAction(app, device, PREINSTALL, STATUS_SUCCESS).then((action)=>{
          self.data.actions.push(action);
          self.needsSave = true;
        });
      }
    });
  }

  UsageData.prototype.recordInstall = function(app, device, status ) {
    if (!this.shouldTrackApp(app)) {
      return false;
    }
    let self = this;
    this.getAction(app, device, INSTALL, status).then((action)=>{
      if (device.appusage_share_enabled) {
        self.data.impActions.push(action);
        var evt = new CustomEvent('metricsupdate',
            { bubbles: true,
              cancelable: false,
            });
        window.dispatchEvent(evt);
      } else {
        self.data.actions.push(action);
      }
      self.needsSave = true;
    });
    return true;
  };

  UsageData.prototype.recordUninstall = function(app, device, status) {
    if (!this.shouldTrackApp(app)) {
      return false;
    }
    let self = this;
    this.getAction(app, device, UNINSTALL, status).then((action)=>{
      if (device.appusage_share_enabled) {
        self.data.impActions.push(action);
        var evt = new CustomEvent('metricsupdate',
            { bubbles: true,
              cancelable: false,
            });
        window.dispatchEvent(evt);
      } else {
        self.data.actions.push(action);
      }
      self.needsSave = true;
      window.asyncStorage.getItem(app.manifestUrl, (value) => {
        if (value) {
          window.asyncStorage.removeItem(app.manifestUrl);
        }
      });
    });
    return true;
  };

  UsageData.prototype.recordUpdate = function(app, device, status) {
    if (!this.shouldTrackApp(app)) {
      return false;
    }
    // XXX: skip INSTALL event
    if (app.updateTime === 0) {
      return false;
    }
    let self = this;
    let evt;
    this.getAction(app, device, UPDATE, status).then((action)=>{
      if (device.appusage_share_enabled) {
        self.data.impActions.push(action);
        evt = new CustomEvent('metricsupdate',
            { bubbles: true,
              cancelable: false,
            });
        window.dispatchEvent(evt);
      } else {
        self.data.actions.push(action);
      }
      self.needsSave = true;
      let isSilent = false;
      window.asyncStorage.getItem(app.manifestUrl, (value) => {
        let appInfo = JSON.parse(value);
        isSilent = appInfo.isSilent;
        self.debug('recordUpdate :: is_silent:: ', isSilent);
        window.asyncStorage.setItem(app.manifestUrl, JSON.stringify({
          'version' : action.app_version,
          'isSilent' : isSilent
        }));
        evt = new CustomEvent('metricsupdate', {
          bubbles: true,
          cancelable: false,
        });
        window.dispatchEvent(evt);
      });
    });
    return true;
  };

  UsageData.prototype.recordCrashed = function(app, device) {
    var usage = this.getAppUsage(app.manifestUrl);
    usage.crashed++;
    this.needsSave = true;
    this.debug(app, 'crashed');
    this.getAction(app, device, APPCRASHED, STATUS_SUCCESS).then((action)=>{
      self.data.actions.push(action);
      self.needsSave = true;
    });
    return true;
  };

  UsageData.prototype.recordActivity = function(app, url) {
    if (!this.shouldTrackApp(app)) {
      return false;
    }

    var usage = this.getAppUsage(app.manifestUrl);
    var count = usage.activities[url] || 0;
    usage.activities[url] = ++count;
    this.needsSave = true;
    this.debug(app, 'invoked activity', url);
    return true;
  };

  // Merge a newer batch of data into this older batch.
  // We use this to recover from metrics transmission failures
  UsageData.prototype.merge = function(newbatch) {
    // Since we transmit while the user is idle, often there will not be
    // any new data collected while we're trying to transmit and in that
    // case there is nothing to merge.
    if (!newbatch || newbatch.isEmpty()) {
      return;
    }

    // Otherwise, loop through all the apps that we have data for
    // in the new batch and merge the new usage data with the old
    // usage data.
    for (var app in newbatch.data.apps) {
      var newdays = newbatch.data.apps[app];
      for (var day in newdays) {
        var newusage = newdays[day];
        var oldusage = this.getAppUsage(app, day);

        oldusage.usageTime += newusage.usageTime;
        oldusage.invocations += newusage.invocations;

        for (var url in newusage.activities) {
          var newcount = newusage.activities[url];
          var oldcount = oldusage.activities[url] || 0;
          oldusage.activities[url] = oldcount + newcount;
        }
      }
    }

    // loop through all the search providers that we have data for
    // and merge the new searches into the old searches.
    for (var provider in newbatch.data.searches) {
      var newsearch = newbatch.data.searches[provider];
      var oldsearch = this.data.searches[provider];

      if (!oldsearch) {
        // If no usage exists for this provider, create a new empty object.
        this.data.searches[provider] = {};
        this.debug('creating new object for provider', provider);
      }

      for (var daykey in newsearch) {
        var daySearch = oldsearch[daykey];
        if (!daySearch) {
          oldsearch[daykey] = newsearch[daykey];
        } else {
          var newsearchcount = newsearch[daykey].count;
          var oldsearchcount = oldsearch[daykey].count || 0;
          oldsearch[daykey].count = oldsearchcount + newsearchcount;
        }
      }
    }
  };

  //getlocation
  UsageData.prototype.getLocation = function (isEnabled) {
    this.debug(" AUM enabled getPosition called ::");
    let self = this;
    return new Promise(function(resolve) {
      let options = {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 0
      };
      if (isEnabled) {
        self.debug('AUM geolocation :: geolocation  avaiable ');
          navigator.geolocation.getCurrentPosition((pos) => {
            self.debug(" AUM getCurrentPosition ::pos :: " + JSON.stringify(pos.coords));
            self.debug(" AUM enabled getPosition ::", JSON.stringify(pos));
            resolve(pos.coords);
          },(err) => {
            self.debug('AUM getCurrentPosition : err.code:' + err.code + '  err.message:' +err.message);
            resolve(null);
          }, options);
      } else {
        SettingsObserver.setValue([{
          name: 'geolocation.enabled',
          value: true
        }]).then(function() {
          self.debug(" AUM getPosition ::geolocation.enabled ");
          // To make sure geolocation enabled
          navigator.geolocation.getCurrentPosition((pos) => {
            SettingsObserver.setValue([{
              name: 'geolocation.enabled',
              value: false
            }]);
            self.debug(" AUM getPosition ::", JSON.stringify(pos));
            resolve( pos.coords);
          },(err) => {
            self.debug('AUM getCurrentPosition : err.code:' + err.code + '  err.message:' + err.message);
            resolve(null);
          }, options);
        }, function() {
          resolve(null);
        });
      }
    });
  };

  // Persist the current batch of metrics so we don't lose it if the user
  // switches the phone off.
  UsageData.prototype.save = function(force) {
    if (force || this.needsSave) {
      asyncStorage.setItem(PERSISTENCE_KEY, this.data);
      this.needsSave = false;
      this.debug('Saved app usage data');
    }
  };

  // Load the current metrics from persistant storage.
  // Note that this is an async factory method, not an instance method.
  UsageData.load = function(callback) {
    asyncStorage.getItem(PERSISTENCE_KEY, function(data) {
      var usage = new UsageData();
      if (data) {
        usage.data = data;
        // Handle a scenario with old app data that does not have searches
        if (typeof usage.data.searches === 'undefined') {
          usage.data.searches = {};
        }

        // If we loaded persisted data, then the absolute start time can
        // and should no longer be adjusted. So remove the relative time.
        delete usage.relativeStartTime;
      }
      callback(usage);
    });
  };

  exports.UsageData = UsageData;
}(window));
