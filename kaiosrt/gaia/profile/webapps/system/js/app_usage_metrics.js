/**
 * This module records app usage data (aggregate time used, number of
 * invocations an uninstalls) for all apps on the phone and periodically
 * transmits that data to Mozilla's telemetry server.
 *
 * Data is only collected and transmitted if the user opts in to telemetry
 * in the FTU or Settings app.
 *
 * A note about time: Date.now() returns absolute time. It changes if the user
 * sets the time in the Settings app, and also can change via the NTP protocol
 * when the device connects to the internet. To avoid having changes in clock
 * time affect our app usage timing data we use performance.now() which
 * returns a relative time whose values do not change when the absolute time
 * changes. However, the batches of metrics we submit do include absolute
 * start and end times. For these times, we do need to use Date.now(), and for
 * values that are compared to the batch start time, we obviously have to
 * use absolute time as well. Note that only absolute time can be persisted
 * since the relative time epoch restarts each time the phone is rebooted.
 *
 * Sometimes on system startup, we see changes to the absolute time of
 * more than a day when we connect to the internet and adjust the time
 * with NTP. These large time changes can skew the batch start times
 * that we report and so this module includes code to adjust the batch
 * start time when the absolute time is changed. This can only be
 * done for fresh batches of metrics that we start ourselves--if we've
 * loaded a persisted batch of metrics, then the start time is from a
 * previous boot of the device and we cannot adjust it. Perhaps when
 * bug 1069863 is fixed we will not have these dramatic time changes when
 * we start up and we can remove the workaround.
 *
 * Known issues:
 *
 *  The lockscreen does not generate any events when the user launches the
 *  camera from a locked lockscreen, so any time spent using the camera app
 *  from the lockscreen will be recorded as time on the lockscreen
 *
 *  We would like to be able to record OOMs and similar app failures but
 *  the system app window management code does not seem to distinguish
 *  normal app termination from abnormal and I can't figure out any way
 *  to tell when an app has crashed.
 */

/* global asyncStorage, SettingsObserver, SIMSlotManager,
          MobileOperator, TelemetryRequest, applications, UsageData
          LazyLoader, InternalUsageMetrics, AlarmMessageHandler,
          IdleTimer */
(function(exports) {
  'use strict';

  /*
   * Simple constants used in this module.
   */

  // This is the asyncStorage key we use to persist our app usage data so
  // that it survives across device restarts.
  const PERSISTENCE_KEY = 'metrics.app_usage.data.v2';

  // This is the asyncStorage key we use to persist our device ID
  // v1 of this ID used a randomly generated String, while v2 uses a UUID
  const DEVICE_ID_KEY = 'metrics.app_usage.deviceID.v2';

  // This is the asyncStorage key we use to persist out build ID
  const BUILD_ID_KEY = 'metrics.app_usage.buildID.v2';
  const STATUS_SUCCESS = 999;

  // Various event types we use. Constants here to be sure we use the
  // same values when registering, unregistering and handling these.
  const APPOPENED = 'appopened';
  const HOMESCREEN = 'homescreenopened';
  const ACTIVITY = 'activitycreated';
  const LOCKED = 'lockscreen-appopened';    // In 2.0, use 'locked'
  const UNLOCKED = 'lockscreen-appclosed';  // In 2.0, use 'unlocked'
  const SCREENCHANGE = 'screenchange';      // sleep or wake
  const INSTALL = 'applicationinstall-success';//bug35035 event changesd from 'applicationinstall' to 'applicationinstall-success'
  const UNINSTALL = 'applicationuninstall';
  const UPDATE = 'applicationupdate';
  const ONLINE = 'online';
  const OFFLINE = 'offline';
  const TIMECHANGE = 'timechange';
  const ATTENTIONOPENED = 'attentionopened';
  const ATTENTIONCLOSED = 'attentionclosed';
  const IDLE = 'idle';
  const ACTIVE = 'active';
  const IACMETRICS = 'iac-app-metrics';
  const APPCRASHED = 'appcrashed';
  const INSTALL_FAILED = 'applicationinstall-failed';
  const UNINSTALL_FAILED = 'applicationuninstall-failed';
  const UPDATE_FAILED = 'applicationupdate-failed';
  const METRICSUPDATE = 'metricsupdate';

  // This is the list of event types we register handlers for
  const EVENT_TYPES = [
    APPOPENED,
    HOMESCREEN,
    ACTIVITY,
    LOCKED,
    UNLOCKED,
    SCREENCHANGE,
    INSTALL,
    UNINSTALL,
    UPDATE,
    ONLINE,
    OFFLINE,
    TIMECHANGE,
    ATTENTIONOPENED,
    ATTENTIONCLOSED,
    IACMETRICS,
    APPCRASHED,
    INSTALL_FAILED,
    UNINSTALL_FAILED,
    UPDATE_FAILED,
    METRICSUPDATE
  ];

  // This AppUsageMetrics() constructor is the value we export from
  // this module. This constructor does no initialization itself: that
  // is all done in the start() instance method. See bootstrap.js for
  // the code that actually calls the constructor and the start method.
  function AppUsageMetrics() {}

  // We use the acronym AUM internally to save typing and make
  // references to class variables and constants more legible.
  const AUM = AppUsageMetrics;

  /*
   * Exported and configurable properties. Properties of AUM are visible
   * outside of the module and are exposed for unit testing and to enable
   * external configuration.
   */

  // Export the UsageData class so we can test it independently
  AUM.UsageData = UsageData;

  // Set to true to to enable debug output
  AUM.DEBUG = true;

  // This logging function is the only thing that is not exposed through
  // the AppUsageMetrics contstructor or its instance.
  function debug(...args) {
    if (AUM.DEBUG) {
      args.unshift('[AppUsage]');
      console.log.apply(console, args);
    }
  }

  // What setting do we listen to to turn app usage metrics on or off.
  // This default value is the same setting that turns telemetry on and off.
  AUM.TELEMETRY_ENABLED = false;

  // Base URL for sending data reports
  // Can be overridden with metrics.appusage.reportURL setting.
  AUM.REPORT_URL = 'https://metric.kai.jiophone.net/v2.0';

  // Server for sending data reports
  // Can be overridden with apps.serviceCenterUrl setting.
  AUM.REPORT_SERVER = 'https://api.kaiostech.com/v2.0';
  // Server endpoint for sending data reports
  AUM.REPORT_ENDPOINT = '/apps/metrics';

  // How often do we try to send the reports
  // Can be overridden with metrics.appusage.reportInterval setting.
  // We send report once per day,
  // but we record usage and spit them per day as well.
  // So we have to avoid send empty chuch in each new day.
  AUM.REPORT_INTERVAL = 24 * 60 * 60 * 1000 - 5 * 60 * 1000;

  // If the telemetry server does not respond within this amount of time
  // just give up and try again later.
  // Can be overridden with metrics.appusage.reportTimeout setting.
  AUM.REPORT_TIMEOUT = 20 * 1000;             // 20 seconds

  // If sending a report fails (even though the we're online) how
  // long do we wait before trying it again?
  // Can be overridden with metrics.appusage.retryTimeout setting.
  AUM.RETRY_INTERVAL = 60 * 60 * 1000;        // 1 hour

  // How much user idle time (in seconds, not ms) do we wait for before
  // persisting our data to asyncStorage or trying to transmit it.
  AUM.IDLE_TIME = 5;                          // seconds

  // Telemetry payload version
  AUM.TELEMETRY_VERSION = 1;

  // Telemetry "reason" field
  AUM.TELEMETRY_REASON = 'appusage';

  // App name (static for Telemetry)
  AUM.TELEMETRY_APP_NAME = 'FirefoxOS';

  /*
   * AppUsageMetrics instance methods
   */

  //
  // The AppUsageMetrics constructor does no initialization of any sort.
  // By system app convention, the initialization code is in this start()
  // instance method instead. Note that this is not the same as the
  // startCollecting() method which is only called if the user has actually
  // opted in to telemetry.
  //
  AUM.prototype.start = function start() {
    this.reset();  // initialize our state variables
    this.startCollecting();
  };

  // This method shuts everything down and is only exposed for unit testing.
  // Note that this is not the same as the stopCollecting() method which is
  // used to stop data collection but keep the module running.
  AUM.prototype.stop = function stop() {
    this.stopCollecting();
  };

  // Reset (or initialize) the AppUsageMetrics instance variables
  AUM.prototype.reset = function() {
    // Are we collecting data? This is set to true by startCollecting()
    // and set to false by stopCollecting()
    this.collecting = false;

    // The UsageData object we're currently collecting data in, or
    // null if we're not collecting anything. Initialized in startCollecting()
    // Note that this object includes a start time for the batch so we know
    // how old it is.
    this.metrics = null;

    // This is the unique string we send with each batch of data so that
    // batches can be linked together into larger time periods
    this.deviceID = null;

    // This is the unique string reading from settings.
    // We send this each action data, and we also save this for detecing FTU & FOTA
    this.buildID = null;

    // Is the user idle? Updated in handleEvent() based on an idle observer
    this.idle = false;

    // Is the lockscreen running?
    this.locked = false;

    // What is the URL of the lockscreen app?
    this.lockscreenApp = null;

    // A stack of attention window manifest URLs and start times
    this.attentionWindows = [];

    // When was the last time that a transmission attempt failed.
    // This is used along with the retry interval.
    this.lastFailedTransmission = 0;

    // This is the URL of the app that the user is currently using. We determine
    // this from appopened events and homescreenopened events. Note that we
    // don't change this variable when the lockscreen is displayed, we just set
    // the locked variable.
    this.currentApp = null;

    // This is object is used to record the device info reading from settings
    this.device = {};

    // This is the server URL of receiving metrics data
    this.url = null;

    // When did the currently running app start?
    this.currentAppStartTime = performance.now();

    // record Install event as it is coming in 2 parts
    this.installFailedRecord = [];
    // set Aram Callback for when alarm fired
    this.alarmCallBack = null;
  };

  AUM.prototype.getTopAttentionWindow = function getTopAttentionWindow() {
    return this.attentionWindows ?
      this.attentionWindows[this.attentionWindows.length - 1] :
      undefined;
  };

  AUM.prototype.getCurrentApp = function() {
    return !this.attentionWindows || this.attentionWindows.length === 0 ?
      this.currentApp : this.getTopAttentionWindow().app;
  };

  AUM.prototype.getCurrentStartTime = function() {
    return !this.attentionWindows || this.attentionWindows.length === 0 ?
      this.currentAppStartTime : this.getTopAttentionWindow().startTime;
  };

  AUM.prototype.setCurrentStartTime = function(time) {
    if (!this.attentionWindows || this.attentionWindows.length === 0) {
      this.currentAppStartTime = time;
    } else {
      this.getTopAttentionWindow().startTime = time;
    }
  };

  // Start collecting app usage data. This function is only called if the
  // appropriate setting is turned on. The done callback is called when
  // setup is complete, but this feature is only needed for tests.
  AUM.prototype.startCollecting = function startCollecting(done) {
    var self = this;

    debug('starting app usage metrics collection');

    // If we're already running there is nothing to start
    if (this.collecting) {
      return;
    }
    this.collecting = true;

    // Begin the startup process by loading data.
    loadData();

    // Step 1: load any persisted app usage data
    function loadData() {
      // This loads existing data or creates a new object if no data is saved.
      // We store it in the metrics variable that makes it visible throughout
      // the module
      UsageData.load(function(loadedMetrics) {
        // Remember the metrics data
        self.metrics = loadedMetrics;

        // Now move on to step two in the startup process
        getConfigurationSettings();
        self.alarmFireListner();
      });
    }

    // Step 2: Configure the server url and other variables by
    // allowing values in the settings database to override the defaults.
    function getConfigurationSettings() {
      // Settings to query, mapped to default values
      var query = {
        'ftu.pingURL': AUM.REPORT_URL,
        'metrics.appusage.reportURL': null,
        'metrics.appusage.reportInterval': AUM.REPORT_INTERVAL,
        'metrics.appusage.reportTimeout': AUM.REPORT_TIMEOUT,
        'metrics.appusage.retryInterval': AUM.RETRY_INTERVAL,
        'debug.performance_data.shared': false,
        'apps.serviceCenterUrl': AUM.REPORT_SERVER,
        'deviceinfo.cu': '',
        'deviceinfo.platform_build_id': '',
        'deviceinfo.platform_version': '',
        'deviceinfo.hash_id': '', // bug54488 for Jio branch deviceinfo.hash_id is used instead of app.update.custom
        'deviceinfo.software': 'unknown', // added to get software version.
        'geolocation.enabled': '', //added to hace geo-location enabled
        'debugger.remote-mode': 'disabled',
        'app.update.custom': '',
      };
      // In order to get non-empty values, we should retry to get values.
      var retries = 0;
      var timer = setInterval(function() {
        AUM.getSettings(query, function(result) {
          AUM.REPORT_URL = result['metrics.appusage.reportURL'] ||
                           result['ftu.pingURL'];

          AUM.REPORT_INTERVAL = result['metrics.appusage.reportInterval'];
          AUM.REPORT_TIMEOUT = result['metrics.appusage.reportTimeout'];
          AUM.RETRY_INTERVAL = result['metrics.appusage.retryInterval'];

          AUM.TELEMETRY_ENABLED = result['debug.performance_data.shared'];

          // Get a unique identifier for this device so that the periodic metrics reports
          // we send can be linked together to allow analysis over a longer period of time.
          self.deviceID = result['deviceinfo.hash_id']; // bug54488 for Jio branch deviceinfo.hash_id is used instead of app.update.custom
          AUM.DEBUG = result['debugger.remote-mode'] !== 'disabled' ? true : false;
          self.device['software'] = result['deviceinfo.software'];
          self.device['cu'] = result['deviceinfo.cu'];
          self.device['platform_build_id'] = result['deviceinfo.platform_build_id'];
          self.device['platform_version'] = result['deviceinfo.platform_version'];
          self.device['geolocation_enabled'] = result['geolocation.enabled'];
          self.device['appusage_share_enabled'] = AUM.TELEMETRY_ENABLED;
          self.url = AUM.REPORT_URL + AUM.REPORT_ENDPOINT;
          debug(' device values  cu: ' + self.device['cu'] + '    deviceID:: ' + self.deviceID);
          debug(' device self.url: ' + self.url);
          if ((self.device['cu'] && self.device['cu'] !== '' &&
              self.device['platform_build_id'] && self.device['platform_build_id'] !== '' &&
              self.device['platform_version'] && self.device['platform_version'] !== '' &&
              self.deviceID && self.deviceID !== '') || retries > 5) {
                if (!self.deviceID && result['app.update.custom']) {
                  self.deviceID = result['app.update.custom'];
                }
                // clear timer
                clearInterval(timer);
                // Move on to the next step in the startup process
                getBuildID();
                self.addAutoUpdateAlarm(AUM.REPORT_INTERVAL);
              }
          retries += 1;
        });
      }, 10000);
    }

    // Step 3: Look up, or get the build identifier for this device
    // If the is null which means it's the first launch, and we need to
    // collect pre-installed apps.
    function getBuildID() {
      asyncStorage.getItem(BUILD_ID_KEY, function(value) {
        if (value) {
          self.buildID = value;
        } else {
          // FTU
          self.buildID = self.device['platform_build_id'];
          asyncStorage.setItem(BUILD_ID_KEY, self.buildID);

          // records all the pre-installed app
          self.metrics.recordPreinstall(self.device);
        }
        // Move on to the next step in the startup process
        waitForApplicationsReady();
      });
    }

    // Step 5: Ensure the applications cache is ready
    function waitForApplicationsReady() {
      if (applications.ready) {
        registerHandlers();
        window.dispatchEvent(new CustomEvent('metricsready'));
        return;
      }

      debug('Waiting for applications to be ready');
      window.addEventListener('applicationready', function onAppsReady() {
        window.removeEventListener(onAppsReady);
        registerHandlers();
      });
    }

    // Step 6: register the various event handlers we need
    function registerHandlers() {
      // Basic event handlers
      EVENT_TYPES.forEach(function(type) {
        window.addEventListener(type, self);
      });

      // Register for idle events
      this.idleTimer = new IdleTimer();
      this.idleTimer.setIdleTimeout({
        time: AUM.IDLE_TIME,
        onidle: function() { self.handleEvent(new CustomEvent(IDLE)); },
        onactive: function() { self.handleEvent(new CustomEvent(ACTIVE)); }
      });

      if (done) {
        done();
      }
    }
  };

  // Stop collecting app usage data and discard any we have already collected.
  // This is called if the setting is turned off.
  AUM.prototype.stopCollecting = function stopCollecting() {
    debug('stopping app usage data collection and deleting stored data');

    // If we're not already running there is nothing to stop
    if (!this.collecting) {
      return;
    }
    this.collecting = false;

    // Delete stored data and our device id
    asyncStorage.removeItem(PERSISTENCE_KEY);
    asyncStorage.removeItem(DEVICE_ID_KEY);

    // Stop listening to all events
    this.idleTimer.clearIdleTimeout();

    var self = this;
    EVENT_TYPES.forEach(function(type) {
      window.removeEventListener(type, self);
    });

    // Reset our state, discarding local copies of metrics and deviceID
    this.reset();
  };

  //
  // This is the heart of this module. It listens to the various events and
  // 1) records app usage data
  // 2) persists app usage data at appropriate times
  // 3) transmits app usage data at appropriate times
  //
  AUM.prototype.handleEvent = function handleEvent(e) {
    var now = performance.now();
    var app = {};
    var manifest = '';
    debug('got an event: ', e.type);
    switch (e.type) {

    case APPOPENED:
    case HOMESCREEN:
      // The user has opened an app, switched apps, or switched to the
      // homescreen. Record data about the app that was running and then
      // update the currently running app.
      this.metrics.recordInvocation(this.getCurrentApp(), this.device,
                                    now - this.getCurrentStartTime());
      this.attentionWindows = [];
      this.currentApp = e.detail;
      this.currentAppStartTime = now;
      break;

    case ATTENTIONOPENED:
      // Push the current attention screen start time onto stack, and use
      // currentApp / currentAppStartTime when the stack is empty
      this.metrics.recordInvocation(this.getCurrentApp(), this.device,
                                    now - this.getCurrentStartTime());
      this.attentionWindows.push({
        app: e.detail,
        startTime: now
      });
      break;

    case ACTIVITY:
      // If the current app launches an inline activity we record that
      // and maintain a count of how many times each activity (by url)
      // has been invoked by this app. This will give us interesting data
      // about which apps use which other apps. Note that we do not track
      // the amount of time the user spends in the activity handler.
      this.metrics.recordActivity(this.currentApp, e.detail.url);
      break;

    case LOCKED:
      // Record the time we ran the app, but keep the app the same
      // because we'll be back to it when the lockscreen is unlocked.
      // Note that if the lockscreen is disabled we won't get this event
      // and will just go straight to the screenchange event. In that
      // case we have to record the invocation when we get that event
      this.metrics.recordInvocation(this.getCurrentApp(), this.device,
                                    now - this.getCurrentStartTime());
      this.setCurrentStartTime(now);

      // Remember that the lockscreen is active. When we wake up again
      // we need to know this to know whether the user is at the lockscreen
      // or at the current app.
      this.locked = true;

      // In version 2.1 we use lockscreen-appopened events and get a real URL
      // In 2.0 and before we just use a locked event and don't get the url
      this.lockscreenApp = e.detail;
      break;

    case UNLOCKED:
      // If the lockscreen was started when the phone went to sleep, then
      // when we wake up we note the time and when we get this event, we
      // record the time spent on the lockscreen.
      if (this.locked && this.lockscreenApp) {
        this.metrics.recordInvocation(this.lockscreenApp, this.device,
                                      now - this.currentAppStartTime);

        // We left the currentApp unchanged when the phone went to sleep
        // so now that we're leaving the lock screen we will be back at whatever
        // app or homescreen we left. We just have to start timing again
        this.setCurrentStartTime(now);
      }
      this.locked = false;
      break;

    case SCREENCHANGE:
      if (e.detail.screenOffBy === 'proximity') {
        // Ignore when the screen state changes because of the proximity sensor
        return;
      }

      if (e.detail.screenEnabled) {
        // We just woke up. Note the time. This will be used for recording
        // time on the lockscreen if we're locked or time at the old app.
        this.setCurrentStartTime(now);
      }
      else {
        // We're going to sleep. If the lockscreen is disabled and we went
        // directly to sleep then record the invocation of the current app.
        // Otherwise, we already recorded that when we got the locked event
        // so now we record lockscreen time. Typically there is just a
        // fraction of a second between the LOCKED and SCREENCHANGE events
        // and the data gets discarded because the time is too short. But
        // if the user wakes the phone up and never unlocks it and then
        // we time out again, we need to record lockscreen time here,
        // not current app time.
        app = this.locked ? this.lockscreenApp : this.getCurrentApp();
        this.metrics.recordInvocation(app, this.device, now - this.getCurrentStartTime());
      }
      break;

    case ATTENTIONCLOSED:
      // The attention window on top of the stack was closed. When there are
      // other attention windows, we reset the startTime of the top window on
      // the stack. Otherwise we reset the currentApp's start time when the
      // stack is empty.
      var attentionWindow = this.getTopAttentionWindow();
      if (attentionWindow && attentionWindow.app &&
          attentionWindow.app.manifestUrl === e.detail.manifestUrl) {
        this.metrics.recordInvocation(e.detail, this.device,
                                      now - attentionWindow.startTime);
        this.attentionWindows.pop();
      } else {
        debug('Unexpected attention window closed! ' + e.detail.manifestUrl);
      }

      this.setCurrentStartTime(now);
      break;

    case INSTALL:
      debug('INSTALL', e.detail.application);
      app = e.detail.application;
      manifest = app.manifest || app.updateManifest;
      debug('INSTALL :: id:: ', app.manifestUrl);
      debug('INSTALL :: version:: ', manifest.version);
      this.metrics.recordInstall(e.detail.application, this.device, STATUS_SUCCESS);
      break;

    case INSTALL_FAILED:
      debug('INSTALL_FAILED', e.detail.application);
      app = e.detail.application;
      manifest = app.manifest || app.updateManifest;
      debug('INSTALL_FAILED :: id:: ', app.manifestUrl);
      debug('INSTALL_FAILED :: version:: ', manifest.version);
      debug('INSTALL_FAILED :: error code:: ', e.detail.error_code);
      this.installFailedRecord.push(app);
      this.metrics.recordInstall(e.detail.application, this.device, e.detail.error_code);
      break;
    case UNINSTALL:
      debug('UNINSTALL', e.detail.application);
      app = e.detail.application;
      manifest = app.manifest || app.updateManifest;
      debug('UNINSTALL:: id:: ', app.manifestUrl);
      debug('UNINSTALL :: version:: ', manifest.version);
      if (this.installFailedRecord.length > 0 &&
        app.manifestUrl === this.installFailedRecord.pop().manifestUrl) return;
      this.metrics.recordUninstall(e.detail.application, this.device, STATUS_SUCCESS);
      break;
    case UNINSTALL_FAILED:
      debug('UNINSTALL_FAILED', e.detail.application);
      this.metrics.recordUninstall(e.detail.application, this.device, e.detail.error_code);
      break;
    case UPDATE:
      debug('UPDATE', e.detail.application);
      app = e.detail.application;
      manifest = app.manifest || app.updateManifest;
      /* TODO, it seemed only for print log, so temp comment it
       * var appInfo = JSON.parse(window.localStorage.getItem(app.manifestUrl));
       * debug('UPDATE :: ID:: ', app.manifestUrl);
       * debug('UPDATE :: saved id value :: ', appInfo.version);
       * debug('UPDATE :: version:: ', manifest.version);
       */
      this.metrics.recordUpdate(e.detail.application, this.device, STATUS_SUCCESS);

      break;
    case UPDATE_FAILED:
      debug('UPDATE_FAILED', e.detail.application);
      this.metrics.recordUpdate(e.detail.application, this.device, e.detail.error_code);
      break;
    case APPCRASHED:
      this.metrics.recordCrashed(e.detail, this.device);
      break;

    case IDLE:
      this.idle = true;
      break;

    case ACTIVE:
      this.idle = false;
      break;

    case TIMECHANGE:
      if (this.metrics.relativeStartTime !== undefined) {
        // If we have a relative time recorded for this batch then we
        // can adjust the batch start time on NTP or user time changes.
        // This shouldn't really be necessary but we are seeing some
        // time changes on reboot where the time changes by more than
        // a day when the phone first starts up and connects to a network.
        // This may be caused by bug 1069863, and when that bug is fixed
        // we can consider removing this timechange handling code.
        var deltaT = performance.now() - this.metrics.relativeStartTime;
        var oldStartTime = this.metrics.data.start;
        var newStartTime = Date.now() - Math.round(deltaT);
        this.metrics.data.start = newStartTime;
        this.metrics.save(true);
        debug('System time change; converted batch start time from:',
              new Date(oldStartTime).toString(), 'to:',
              new Date(newStartTime).toString());
      }
      var currentAlarm = this._nextAutoUpdateAlarmDate;
      var currentTime = Date.now();
      debug(' Current Alarm :: ' + currentAlarm.getTime() + '   currentTime :: ' + currentTime);
      if (currentAlarm.getTime() - currentTime > 86400000) {
        debug('Alarm need to reset');
        this.resetMetricsAlarm(AUM.REPORT_INTERVAL);
      }
      break;

    case IACMETRICS:
      //We need to check this here as we now have a helper module and we
      //don't want to accept any actions we don't handle.
      if (e.detail.action === 'websearch') {
        debug('got a search event for provider: ', e.detail.data);
        this.metrics.recordSearch(e.detail.data);
      }
      break;
    case METRICSUPDATE:
      if (this.device['appusage_share_enabled']) {
        debug('got a search METRICSUPDATE : ');
        this.urgentTransmit();
      }
      break;
    }

    /*
     * We've updated our state based on the events. Now see whether we should
     * save or transmit the data.
     */

    // If we're idle, persist the metrics
    if (this.idle) {
      this.metrics.save(); // Doesn't do anything if metrics have not changed
    }

  };

  // Transmit the current batch of metrics to the metrics server.
  // Start a new batch of data. If the transmission fails, merge the
  // new batch with the failed batch so we can try again later.
  AUM.prototype.urgentTransmit = function urgentTransmit() {
    var self = this;
    debug(' urgentTransmit :collecting ::  ', this.collecting);
    if (!this.collecting) {
      return;
    }

     // Make a private copy of the metrics data we're going to transmit
    var data = JSON.parse(JSON.stringify(this.metrics.data));

    // If the action data is empty, we should not transmit the data.
    debug(' urgentTransmit :data.impActions ::  ', data.impActions.length);
    var dataLength = data.impActions.length;
    if (dataLength === 0) {
      return;
    }

    send(data);
    function send(data) {
      if (!self.deviceID || !self.device['cu'] || !data) {
        return;
      }
      debug(' urgentTransmit :send :: deviceID ', self.deviceID);
      // Initialize request
      let devdata = {
        did: self.deviceID,
        curef: self.device['cu'],
        version: AUM.TELEMETRY_VERSION,
        data: window.btoa(JSON.stringify(data.impActions))
      };
      var request = new TelemetryRequest(devdata , self.url);
      debug('Transmitted app usage data to server :: ', JSON.stringify(devdata));

      // We don't actually have to do anything if the data is transmitted
      // successfully. We are already set up to collect the next batch of data.
      function onload() {
        const { url, data } = request;
        debug('Transmitted app usage data to', url);
        debug('Decode the data field of the transmitted data ',
          window.atob(data.data));
        // Make a private copy of the metrics data we're going to transmit
        if (self.metrics.data.impActions.length > window.atob(data.data).length) {
          self.metrics.emptyImpActions(window.atob(data.data));
        } else {
          self.metrics.emptyImpActions();
        }
      }

      function retry(e) {
        // If the attempt to transmit a batch of data fails, we'll merge
        // the new batch of data (which may be empty) in with the old one
        // and resave everything so we can try again later. We also record
        // the time of this failure so we don't try sending again too soon.
        debug('App usage metrics transmission failure:', e.type);

        // We use absolute time here because we will be comparing to
        // the absolute batch start time.
        self.lastFailedTransmission = Date.now();
      }

      request.send({
        timeout: AUM.REPORT_TIMEOUT,
        onload: onload,
        onerror: retry,
        onabort: retry,
        ontimeout: retry
      });
    }
  };

  // Transmit the current batch of metrics to the metrics server.
  // Start a new batch of data. If the transmission fails, merge the
  // new batch with the failed batch so we can try again later.
  AUM.prototype.transmit = function transmit() {
    var self = this;

    if (!this.collecting) {
      return;
    }

    // Make a private copy of the metrics data we're going to transmit
    var data = JSON.parse(JSON.stringify(this.metrics.data));

    // Share uasgae data without device info.
    LazyLoader.load('js/internal_usage_metrics.js', () => {
      var imu = new InternalUsageMetrics();
      imu.transmit(data);
      debug(' data sent to JBS');
    });

    // If the action data is empty, we should not transmit the data.
    if (data.actions.length === 0) {
      return;
    }

    // Remember the existing metrics in case transmission fails
    var oldMetrics = this.metrics;

    // But assume that it will succeed and start collecting new metrics now
    this.metrics = new UsageData();

    // Erase the old data by forcing this new empty batch to be saved.
    // This means that if the phone crashes or is switched off before we
    // transmit the data this batch of data will be lost. That is unlikely
    // to happen and data transmission is optional, so it is not worth
    // the extra effort to design something more robust.
    this.metrics.save(true);

    // Add some extra data that we want to transmit. These are not things
    // that need to be persisted with the other data, so we just add it now.
    data.stop = Date.now();           // End of batch time; matches data.start
    data.deviceID = this.deviceID;    // Link to other batches
    data.locale = navigator.language; // Information about the user's language
    data.screen = {                   // Information about screen size
      width: screen.width,
      height: screen.height,
      devicePixelRatio: window.devicePixelRatio
    };

    var deviceInfoQuery = {
      'developer.menu.enabled': false, // If true, data is probably an outlier
      'deviceinfo.hardware': 'unknown',
      'deviceinfo.os': 'unknown',
      'deviceinfo.product_model': 'unknown',
      'deviceinfo.software': 'unknown'
    };

    // Query the settings db to get some more device-specific information
    AUM.getSettings(deviceInfoQuery, function(deviceInfo) {
      data.deviceinfo = deviceInfo;
      data.simInfo = getSIMInfo();
      if (self.device['appusage_share_enabled']) {
        send(data);
      }
    });

    function getSIMInfo() {
      var simInfo = {
        network: null,
        icc: null
      };

      if (SIMSlotManager.noSIMCardConnectedToNetwork()) {
        // No connected SIMs
        return simInfo;
      }

      var slots = SIMSlotManager.getSlots().filter(function(slot) {
        return !slot.isAbsent() && !slot.isLocked();
      });

      if (slots.length === 0) {
        // No unlocked or active SIM slots
        return simInfo;
      }

      var conn = slots[0].conn;
      if (!conn) {
        // No connection
        return simInfo;
      }

      const iccObj = navigator.b2g.iccManager &&
        navigator.b2g.iccManager.getIccById(conn.iccId);
      var iccInfo = iccObj ? iccObj.iccInfo : null;
      var voiceNetwork = conn.voice ? conn.voice.network : null;
      if (!iccInfo && !voiceNetwork) {
        // No voice network or ICC info
        return simInfo;
      }

      simInfo.network = MobileOperator.userFacingInfo(conn);
      if (voiceNetwork) {
        simInfo.network.mnc = voiceNetwork.mnc;
        simInfo.network.mcc = voiceNetwork.mcc;
      }

      if (iccInfo) {
        simInfo.icc = {
          mnc: iccInfo.mnc,
          mcc: iccInfo.mcc,
          spn: iccInfo.spn
        };
      }

      return simInfo;
    }

    function send(data) {
      if (!self.deviceID || !self.device['cu'] || !data) {
        return;
      }

      // Extract AUM data
      let AUMData = {
        apps: data.apps,
        searches: data.searches,
        screen: data.screen,
        locale: data.locale,
        deviceinfo: data.deviceinfo,
        simInfo: data.simInfo,
        start: data.start,
        stop: data.stop
      };

      // Merge AUM data with action data
      // please refer https://bugzilla.kaiostech.com/show_bug.cgi?id=27554
      let mergedData = [].concat(data.actions);
      mergedData.push(AUMData);

      // Initialize request
      var request = new TelemetryRequest({
        did: self.deviceID,
        curef: self.device['cu'],
        version: AUM.TELEMETRY_VERSION,
        data: window.btoa(JSON.stringify(data.actions))
      }, self.url);

      // We don't actually have to do anything if the data is transmitted
      // successfully. We are already set up to collect the next batch of data.
      function onload() {
        const { url, data } = request;
        debug('Transmitted app usage data to', url);
        debug('Decode the data field of the transmitted data ', window.atob(data.data));
      }

      function retry(e) {
        // If the attempt to transmit a batch of data fails, we'll merge
        // the new batch of data (which may be empty) in with the old one
        // and resave everything so we can try again later. We also record
        // the time of this failure so we don't try sending again too soon.
        debug('App usage metrics transmission failure:', e.type);

        // We use absolute time here because we will be comparing to
        // the absolute batch start time.
        self.lastFailedTransmission = Date.now();
        oldMetrics.merge(self.metrics);
        self.metrics = oldMetrics;
        self.metrics.save(true);
      }

      request.send({
        timeout: AUM.REPORT_TIMEOUT,
        onload: onload,
        onerror: retry,
        onabort: retry,
        ontimeout: retry
      });
    }
  };

  AUM.prototype.resetMetricsAlarm = function resetMetricsAlarm(interval) {
    debug('resetMetricsAlarm, interval=' + interval );
    if (navigator.b2g && navigator.b2g.alarmManager) {
      navigator.b2g.alarmManager.getAll().then(
        (result) => {
          for (let i = 0; i < result.length; i++) {
            if (result[i].data.type === 'AppUsageMetrics') {
              debug('resetMetricsAlarm ' + result[i].id);
              navigator.b2g.alarmManager.remove(result[i].id);
            }
          }
          debug('resetMetricsAlarm onsuccess ' );
          this.addAutoUpdateAlarm(interval);
        },
        () => debug('resetMetricsAlarm onerror')
      );
    }
  };

  AUM.prototype.alarmFireListner = function alarmFireListner() {
      AlarmMessageHandler.addCallback((message) => {
        debug("!!! alarm fired: " + JSON.stringify(message.data));
        if (message.data && message.data.type === 'AppUsageMetrics') {
          //As per request from JIO removing these checks
          if (!this.metrics.isEmpty()) {
            this.addAutoUpdateAlarm(AUM.REPORT_INTERVAL);
            this.transmit();
          } else {
            this.addAutoUpdateAlarm(AUM.RETRY_INTERVAL);
          }
        }
      });
  };

  AUM.prototype.addAutoUpdateAlarm = function addAutoUpdateAlarm(interval) {
    debug('addAutoUpdateAlarm, interval=' + interval );
    if (interval <= 0) {
      debug('addAutoUpdateAlarm, interval=' + interval +
        '; no need to add alarm');
      return;
    }
    this.isAnySilentAlarm().then((result) => {
      if (result !== null) return;
      const alarmDate = new Date(Date.now() + interval);
      if (navigator.b2g && navigator.b2g.alarmManager) {
        navigator.b2g.alarmManager.add({
          date: alarmDate,
          data: { type: 'AppUsageMetrics' },
          ignoreTimezone: true,
        }).then(
          () => {
            debug('_nextAutoUpdateAlarmDate = ' + alarmDate);
            this._nextAutoUpdateAlarmDate = alarmDate;
          },
          (err) => { debug('add alarm failed: ' + err); }
        );
      }
    });
  };

  AUM.prototype.isAnySilentAlarm = function isAnySilentAlarm() {
    return new Promise((resolve) => {
      debug('isAnySilentAlarm');
      if (navigator.b2g && navigator.b2g.alarmManager) {
        navigator.b2g.alarmManager.getAll().then(
          (result) => {
            for (let i = 0; i < result.length; i++) {
              if (result[i].data.type === 'AppUsageMetrics') {
                debug('isAnySilentAlarm' + result[i].id);
                this._nextAutoUpdateAlarmDate = result[i].date;
                resolve(result[i]);
              }
            }
            debug('isAnySilentAlarm onsuccess false');
            resolve(null);
          },
          () => {
            debug('isAnySilentAlarm onerror false');
            resolve(null);
          }
        );
      }
    });
  };

  /*
   * A utility function get values for all of the specified settings.
   * settingKeysAndDefaults is an object that maps settings keys to default
   * values. We query the value of each of those settings and then create an
   * object that maps keys to values (or to the default values) and pass
   * that object to the callback function.
   */
  AUM.getSettings = function getSettings(settingKeysAndDefaults, callback) {
    var pendingQueries = 0;
    var results = {};
    for (var key in settingKeysAndDefaults) {
      var defaultValue = settingKeysAndDefaults[key];
      query(key, defaultValue);
      pendingQueries++;
    }

    function query(key, defaultValue) {
      SettingsObserver.getValue(key).then((value) => {
        if (value === undefined || value === null) {
          value = defaultValue;
        }
        debug(' getSettings  :: ' + key + '    value:: ' + value);
        results[key] = value;
        pendingQueries--;
        if (pendingQueries === 0) {
          callback(results);
        }
      });
    }
  };

  // The AppUsageMetrics constructor is the single value we export.
  exports.AppUsageMetrics = AppUsageMetrics;
}(window));
