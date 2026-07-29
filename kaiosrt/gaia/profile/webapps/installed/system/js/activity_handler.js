/* global Service AccountManagerHandler Aml */

function postActivityResult(result) {
  const iframeSwProxy = window.document.getElementById('sw-proxy');
  const proxySrc = iframeSwProxy.src;
  iframeSwProxy.contentWindow.postMessage(
    { type: 'activity-result', ...result },
    proxySrc
  );
}

function showRebootDeviceDialog(appName, activityHandlerId) {
  const _ = window.api.l10n.get;
  Service.request('DialogService:show', {
    header: _('restart-phone'),
    content: _('restart-content', { appName }),
    ok: 'restart',
    cancel: 'cancel',
    onOk: () => {
      Service.request('startPowerOff', true);
    },
    onBack: () => {
      const result = {
        activityHandlerId,
        activityResult: 'cancel',
        isError: true,
      };
      postActivityResult(result);
    },
    onCancel: () => {
      const result = {
        activityHandlerId,
        activityResult: 'cancel',
        isError: true,
      };
      postActivityResult(result);
    },
    translated: true,
  });
}

// Now clear data is process in settings,
// so system only kill app and clear relate notice
function applicationDataClean({ manifestURL, killOnly }) {
  if (
    manifestURL &&
    Service.query('getTopMostWindow').manifestUrl ===
      window.AppOrigin.getManifestURL('settings')
  ) {
    const runApp = window.appWindowManager.getApp(manifestURL);
    if (runApp) {
      runApp.kill();
    }
    if (killOnly) {
      return;
    }
    Service.request('clearAppNotice', manifestURL);
  }
}

let keepSWStateInterval;
function postDummyMessage() {
  keepSWStateInterval = setInterval(() => {
    // service worker alive -> idle timeout is 30000ms,
    // post a dummy message to keep service worker alive
    const result = {
      isDummy: true,
    };
    postActivityResult(result);
  }, 25000); // less than 30000ms
}

function cancelDummyMessage() {
  if (keepSWStateInterval) {
    clearInterval(keepSWStateInterval);
    keepSWStateInterval = null;
  }
}

window.addEventListener('serviceworkermessage', ({ detail }) => {
  const { category, type, data } = detail;
  if (category === 'systemmessage' && type === 'activity') {
    const { activityHandlerId, source } = data;
    switch (source.name) {
      case 'view':
      case 'browser-open-top':
      case 'browser-top':
        window.browser.handleActivity(source);
        break;
      case 'reboot-device':
        showRebootDeviceDialog(source.data.appName, activityHandlerId);
        break;
      case 'offline-dialog':
        if (!window.isOnline()) {
          Service.request('OfflineDialog:show');
        }
        break;
      case 'account-manager':
        AccountManagerHandler(data);
        break;
      case 'show-toast':
        Service.request('SystemToaster:show', source.data);
        break;
      case 'eventlogger-event':
        var evt = new CustomEvent('evl_remote_action', {
          detail: source,
          bubbles: true,
          cancelable: false
        });
        window.dispatchEvent(evt);
        break;
      case 'aml-msg':
        Aml.handleAmlMsg(source.data);
        break;
      case 'open-notices':
        if (
          Service.query('getTopMostUI').name === 'AppWindowManager' &&
          !!Service.currentApp.isHomescreen &&
          !!Service.currentApp.getTopMostWindow().isHomescreen
        ) {
          Service.request('NotificationView:open');
        }
        break;
      case 'app-data-clean':
        applicationDataClean(source.data);
        break;
      default:
        break;
    }
  } else if (category === 'systemmessage' && type === 'activity_dummy') {
    console.log('activity_dummy: ', data);
    if (data === 'start') {
      postDummyMessage();
    } else if (data === 'stop') {
      cancelDummyMessage();
    }
  }
});
