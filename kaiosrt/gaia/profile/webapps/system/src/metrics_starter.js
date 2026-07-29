import EventLoggerManager from './eventlogger/eventlogger_manager';
import SilentAppInstallManager from './silent_app_install_manager';

function start(type) {
  if (type === 'jio') {
    LazyLoader.load(['../js/app_usage_data.js',
        '../js/app_usage_metrics.js',
        '../js/telemetry.js'],
      () => {
        window.appUsageMetrics = new AppUsageMetrics();
        window.appUsageMetrics.start();
        const siam = new SilentAppInstallManager();
        window.isJioApplication = true;
    });
  } else {
    const instance = new EventLoggerManager();
    instance.start();
    window.evlm = instance;
  }

  SettingsObserver.unobserve('metrics.type', start);
}

SettingsObserver.observe('metrics.type', null, start);
