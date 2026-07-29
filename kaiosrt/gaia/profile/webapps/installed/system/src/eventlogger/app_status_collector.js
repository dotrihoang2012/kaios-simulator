import AppActionStore from './app_action_store';
import DeviceInfoComposer from './device_info_composer';
import SummaryStore from './summary_store';
import { patchAppObject, patchInstalledApps } from './patch_app_object';
import * as utils from './utils';

const EVENT_TYPES = [
  'appopened',
  'homescreenopened',
  'appclosed',
  'activitycreated',
  'lockscreen-appopened',
  'lockscreen-appclosed',
  'screenchange',
  'attentionopened',
  'attentionclosed'
];
const PAUSETIMEOUT = 1000;

const LUANCHER = {
  'manifest': {
    'name': 'Launcher',
    'version': 2.2
  },
  'manifestUrl': window.AppOrigin.getManifestURL('launcher'),
  'installOrigin': 'app://kaios-plus.kaiostech.com'
};

class AppStatusCollector {
  constructor() {
    this.name = 'appStatusCollector';
    this.kaistoreApps = {};
    this.startTime = Date.now();
    //[{"appid": "appid", "appver": "1.2.3"}, ]
    this.downloads = [];
    this.downloadCount = 0;
    //[{"appid": "appid", "appver": "1.2.3"}, ]
    this.uninstalls = [];
    this.downloadCancels = [];

    this.appActionStore = new AppActionStore();

    var category = 'app_summary';
    var defaultData = {
      "daily_download": [], // list of apps (token) and app version downloaded today
      "daily_download_count": 0,
      "daily_uninstall": [], // list of apps (token) and app version that was uninstalled
      "daily_cancels": [],
      "current_inventory": [], // list of apps (token) and app version currently on phone
      "apps": {}
    };
    this.appSummary = new SummaryStore(category, defaultData);

    this.defaultUsage = {
      usageTime: 0,
      invocations: 0,
      openCount: 0,
      appver: "",
      device_utc: [],
      activities: {}
    };

    this.pauseTimer = 0;

    this.appOpenDuration = {};
  }

  getCurrentInventory() {
    var installed = [];
    if (applications && applications.installedApps) {
      const apps = patchInstalledApps(applications.installedApps);
      Object.values(apps).forEach(app => {
        // For the first run, installState could be "null"
        if (app.installState === 0) {
          var obj = {};
          var manifest = app.manifest || app.updateManifest;
          obj.appid = app.manifestUrl;
          obj.appname = manifest.name;
          obj.appver = manifest.version;
          obj.preinstalled = app.preloaded;
          installed.push(obj);
        }
      })
    }

    utils.debug('getCurrentInventory ' + installed);
    return installed;
  }

  start() {
    this.bindHandleInstall = this.handleInstall.bind(this);
    this.bindHandleUninstall = this.handleUninstall.bind(this);
    this.bindHandleUpdate = this.handleUpdate.bind(this);
    this.bindHandleDownloadapplied = this.handleDownloadapplied.bind(this);
    this.bindHandleDownloaderror = this.handleDownloaderror.bind(this);

    AppsManager.addEventListener('installing', this.bindHandleInstall);
    window.addEventListener('applicationinstall', this.bindHandleDownloadapplied);
    window.addEventListener('applicationuninstall', this.bindHandleUninstall);
    window.addEventListener('applicationupdate', this.bindHandleUpdate);
    AppsManager.addEventListener('download_failed', this.bindHandleDownloaderror);

    var self = this;
    EVENT_TYPES.forEach((type) => {
      window.addEventListener(type, self);
    });
  }

  stop() {
    AppsManager.removeEventListener('installing', this.bindHandleInstall);
    window.removeEventListener('applicationinstall', this.bindHandleDownloadapplied);
    window.removeEventListener('applicationuninstall', this.bindHandleUninstall);
    window.removeEventListener('applicationupdate', this.bindHandleUpdate);
    AppsManager.removeEventListener('downloadfailed', this.bindHandleDownloaderror);

    var self = this;
    EVENT_TYPES.forEach((type) => {
      window.removeEventListener(type, self);
    });
  }

  handleEvent(e) {
    var now = performance.now();
    utils.debug('got an event: ' + e.type);

    switch (e.type) {
      case 'appopened': {
        const app = patchAppObject(e.detail);
        // Reset previous app duration.
        this.appOpenDuration[app.manifestUrl] = { duration: 0 };

        this.attentionWindows = [];
        this.currentApp = app;
        this.currentAppStartTime = now;

        this.recordOpened(this.currentApp);
        break;
      }
      case 'appclosed': {
        const app = patchAppObject(e.detail);
        this.currentApp = app;
        // The user has opened an app, switched apps, or switched to the
        // homescreen. Record data about the app that was running and then
        // update the currently running app.
        this.recordInvocation(
          this.getCurrentApp(), now - this.getCurrentStartTime()
        );

        this.recordClosed(this.getCurrentApp());

        if (homescreenWindowManager && homescreenWindowManager.getHomescreen()) {
          this.currentApp = homescreenWindowManager.getHomescreen();
        } else {
          // In case homescreenWindowManager.getHomescreen fails.
          // Fall back to default homescreen
          this.currentApp = LUANCHER;
        }
        break;
      }
      case 'attentionopened':
        // Push the current attention screen start time onto stack, and use
        // currentApp / currentAppStartTime when the stack is empty
        this.recordInvocation(
          this.getCurrentApp(), now - this.getCurrentStartTime()
        );
        // Some apps do not have manifest info, get it from global applications
        var cachedApp = applications.getByManifestURL(e.detail.manifestUrl);
        if (!this.attentionWindows) {
          this.attentionWindows = [];
        }
        this.attentionWindows.push({
          app: cachedApp,
          startTime: now
        });
        var notiWindowApp = this.getCurrentApp();
        this.appOpenDuration[notiWindowApp.manifestUrl] = { duration: 0 };
        this.recordOpened(notiWindowApp);
        break;

      case 'activitycreated':
        // If the current app launches an inline activity we record that
        // and maintain a count of how many times each activity (by url)
        // has been invoked by this app. This will give us interesting data
        // about which apps use which other apps. Note that we do not track
        // the amount of time the user spends in the activity handler.
        this.recordActivity(this.currentApp, e.detail.url);
        break;

      case 'lockscreen-appopened':
        // Record the time we ran the app, but keep the app the same
        // because we'll be back to it when the lockscreen is unlocked.
        // Note that if the lockscreen is disabled we won't get this event
        // and will just go straight to the screenchange event. In that
        // case we have to record the invocation when we get that event
        this.recordInvocation(
          this.getCurrentApp(), now - this.getCurrentStartTime()
        );
        this.setCurrentStartTime(now);

        // Remember that the lockscreen is active. When we wake up again
        // we need to know this to know whether the user is at the lockscreen
        // or at the current app.
        this.locked = true;

        // Fake one
        this.lockscreenApp = {
          manifestUrl: window.AppOrigin.getManifestURL('lockscreen'),
          installOrigin: window.AppOrigin.getOrigin('kaios-plus.kaiostech')
        };

        if (this.getCurrentApp()) {
          clearTimeout(this.pauseTimer);
          this.pauseTimer = setTimeout(() => {
            this.appActionStore.markAction('app_pause', this.getCurrentApp())
          }, PAUSETIMEOUT);
        }
        break;

      case 'attentionclosed':
        // The attention window on top of the stack was closed. When there are
        // other attention windows, we reset the startTime of the top window on
        // the stack. Otherwise we reset the currentApp's start time when the
        // stack is empty.
        var attentionWindow = this.getTopAttentionWindow();
        if (attentionWindow && attentionWindow.app &&
          attentionWindow.app.manifestUrl === e.detail.manifestUrl) {
          this.recordInvocation(
            e.detail, now - attentionWindow.startTime
          );
          this.recordClosed(attentionWindow.app);
          this.attentionWindows.pop();
        } else {
          utils.debug('Unexpected attention window closed! ' + e.detail.manifestUrl);
        }

        this.setCurrentStartTime(now);
        break;

      case 'lockscreen-appclosed':
        // If the lockscreen was started when the phone went to sleep, then
        // when we wake up we note the time and when we get this event, we
        // record the time spent on the lockscreen.
        if (this.locked && this.lockscreenApp) {
          this.recordInvocation(
            this.lockscreenApp, now - this.currentAppStartTime
          );

          // We left the currentApp unchanged when the phone went to sleep
          // so now that we're leaving the lock screen we will be back at whatever
          // app or homescreen we left. We just have to start timing again
          this.setCurrentStartTime(now);
        }
        this.locked = false;
        break;

      case 'screenchange':
        if (e.detail.screenOffBy === 'proximity') {
          // Ignore when the screen state changes because of the proximity sensor
          return;
        }

        if (e.detail.screenEnabled) {
          // We just woke up. Note the time. This will be used for recording
          // time on the lockscreen if we're locked or time at the old app.
          this.setCurrentStartTime(now);
        } else {
          // We're going to sleep. If the lockscreen is disabled and we went
          // directly to sleep then record the invocation of the current app.
          // Otherwise, we already recorded that when we got the locked event
          // so now we record lockscreen time. Typically there is just a
          // fraction of a second between the LOCKED and SCREENCHANGE events
          // and the data gets discarded because the time is too short. But
          // if the user wakes the phone up and never unlocks it and then
          // we time out again, we need to record lockscreen time here,
          // not current app time.
          var app = this.locked ? this.lockscreenApp : this.getCurrentApp();
          this.recordInvocation(app, now - this.getCurrentStartTime());

          if (!this.locked && app) {
            clearTimeout(this.pauseTimer);
            this.pauseTimer = setTimeout(() => {
              this.appActionStore.markAction('app_pause', app);
            }, PAUSETIMEOUT);
          }
        }
        break;
    }
  }

  getTopAttentionWindow() {
    return this.attentionWindows ?
      this.attentionWindows[this.attentionWindows.length - 1] :
      undefined;
  }

  getCurrentApp() {
    if (this.currentApp === undefined) {
      this.currentApp = LUANCHER;
    }

    return !this.attentionWindows || this.attentionWindows.length === 0 ?
      this.currentApp : this.getTopAttentionWindow().app;
  }

  getCurrentStartTime() {
    return !this.attentionWindows || this.attentionWindows.length === 0 ?
      this.currentAppStartTime : this.getTopAttentionWindow().startTime;
  }

  setCurrentStartTime(time) {
    if (!this.attentionWindows || this.attentionWindows.length === 0) {
      this.currentAppStartTime = time;
    } else {
      this.getTopAttentionWindow().startTime = time;
    }
  }

  recordActivity(app, url) {
    var usage = this.getAppUsage(app.manifestUrl);
    var count = usage.activities[url] || 0;
    usage.activities[url] = ++count;
    utils.debug(app, 'invoked activity', url);

    this.appSummary.save();
  }

  recordOpened(app) {
    var manifest = app.manifest || app.updateManifest;
    var manifestUrl = app.manifestUrl;
    var usage = this.getAppUsage(manifestUrl);
    usage.openCount += 1;
    usage.appver = manifest.version;
    usage.device_utc.push(Date.now());
    utils.debug(app, 'invoked recordOpened', usage.openCount);
    this.appSummary.save();

    // Send app_open action
    var obj = {};
    obj.manifestUrl = manifestUrl;
    obj.manifest = manifest;
    var count = 0;
    if (this.appSummary.data.apps[manifestUrl] &&
      this.appSummary.data.apps[manifestUrl].openCount) {
      count = this.appSummary.data.apps[manifestUrl].openCount;
    }
    obj.open_count = count;

    this.appActionStore.markAction('app_open', obj);
    utils.debug('app_open', count);
  }

  recordClosed(app) {
    if (!app.manifestUrl) {
      return false;
    }

    var manifestUrl = app.manifestUrl;
    var duration = (this.appOpenDuration[manifestUrl] &&
      this.appOpenDuration[manifestUrl].duration) || 0;
    app.open_duration = duration;
    this.appActionStore.markAction('app_close', app);
    utils.debug('app_close duration is ', duration);

    // Reset previous app duration.
    if (this.appOpenDuration[manifestUrl]) {
      this.appOpenDuration[manifestUrl] = { duration: 0 };
    }
  }

  recordInvocation(app, time) {
    // Convert time to seconds and round to the nearest second.  If 0,
    // don't record anything. (This can happen when we go to the
    // lockscreen right before sleeping, for example.)
    time = Math.round(time / 1000);
    if (time > 0) {
      var usage = this.getAppUsage(app.manifestUrl);
      usage.invocations++;
      usage.usageTime += time;
      utils.debug(app, 'ran for', time);

      // Save to persistent storage
      this.appSummary.save();

      if (this.appOpenDuration[app.manifestUrl]) {
        this.appOpenDuration[app.manifestUrl].duration += time;
        utils.debug('appOpenDuration', this.appOpenDuration[app.manifestUrl].duration);
      }
    }
  }

  getAppUsage(manifestUrl) {
    var usage = this.appSummary.data && this.appSummary.data.apps[manifestUrl];
    if (!usage) {
      usage = JSON.parse(JSON.stringify(this.defaultUsage));
      this.appSummary.data.apps[manifestUrl] = usage;
    }

    return usage;
  };

  handleDownloadapplied(appObject) {
    var app = appObject.detail.application;
    var manifest = app.manifest;
    var obj = {};
    obj.appid = manifest.name;
    obj.appver = manifest.version || '';

    this.accumulateSummary('daily_download', obj);
    this.appActionStore.markAction('installed', app);
    utils.debug('installed ' + JSON.stringify(obj));
  }

  handleDownloaderror(appsItem) {
    // We do not have cancel for now.
    // if (app.downloadError.name === 'DOWNLOAD_CANCELED') {
    //   var obj = {};
    //   var manifest = app.manifest || app.updateManifest;
    //   obj.appid = manifest.name;
    //   obj.appver = manifest.version;

    //   this.accumulateSummary('daily_cancels', obj);
    // }

    var manifestUrl = appsItem.manifestUrl;
    var app = applications.getByManifestURL(manifestUrl)
    this.appActionStore.markAction('installfailed', app);
  }

  handleInstall() {
    // We add download count by one as long as install event comes.
    // We do not care download failure or installation failure here
    this.accumulateSummary('daily_download_count');
  }

  handleUninstall(appObject) {
    var manifest = appObject.detail.application.manifest;
    var manifestUrl = appObject.detail.application.manifestUrl;
    utils.debug("handleUninstall" + manifest);
    // DOMApplication object will be reclaimed soon.
    // Save data for later use
    var app = {
      'manifest': {
        'name': manifest.name,
        'version': manifest.version
      },
      'manifestUrl': manifestUrl
    };
    var obj = {};
    obj.appid = app.manifest.name;
    obj.appver = app.manifest.version;

    this.accumulateSummary('daily_uninstall', obj);
    var usage = this.getAppUsage(app.manifestUrl);
    app.open_count = usage.openCount;
    this.appActionStore.markAction('uninstall', app);
    utils.debug('uninstall markAction' + JSON.stringify(app));
  }

  handleUpdate(appObject) {
    // Wait until oldVersion is ready
    var manifest = appObject.detail.application.manifest;
    var manifestUrl = appObject.detail.application.manifestUrl;
    var appObj = {
      'manifest': {
        'name': manifest.name,
        'version_new': manifest.version,
        'version': appObject.detail.application.oldVersion || manifest.version
      },
      'manifestUrl': manifestUrl
    };
    var usage = this.getAppUsage(manifestUrl);
    appObj.open_count = usage.openCount;
    this.appActionStore.markAction('update', appObj);
  }

  accumulateSummary(type, action) {
    this.appSummary.init().then(() => {
      switch (type) {
        case 'daily_download':
        case 'daily_uninstall':
        case 'daily_cancels':
          this.appSummary.data[type].push(action);
          break;
        case 'daily_download_count':
          this.appSummary.data[type] += 1;
          break;
      }
      utils.debug('AppStatusSummary save storage', type, action);

      this.appSummary.save();
    });
  }

  packSummary() {
    return Promise.all([this.getCurrentInventory(),
    DeviceInfoComposer.getStandardPackage()])
      .then(results => {
        this.appSummary.data['current_inventory'] = results[0];
        var standardPackage = results[1];
        standardPackage['event_type'] = 'app_summary';
        var data = JSON.parse(JSON.stringify(this.appSummary.data));
        standardPackage['data'] = data;
        this.reset();

        return Promise.resolve(standardPackage);
      }).catch(e => {
        utils.debug('packSummary exception');
        return Promise.reject();
      });
  }

  reset() {
    // Ready to collect new summary
    this.appSummary.reset();
  }
}

export default AppStatusCollector;
