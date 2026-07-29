import React from 'react';
import ReactDOM from 'react-dom';
import BaseComponent from 'base-component';
import BaseModule from 'base-module';
import PermissionDialog from './permission_dialog';
import ChromeEventManager from './chrome_event_manager';

class PermissionManager extends BaseModule {
  requests = [];

  start() {
    window.addEventListener('permission-prompt', this);
    window.addEventListener('lockscreen-appopened', this);
    window.addEventListener('fullscreenchange', this);
  }

  async '_handle_permission-prompt'(evt) {
    // ignore no detail or requestAction 'cancel'
    const { detail } = evt;
    if (!detail || detail.requestAction === 'cancel') return;
    detail.allow = () => {
      var result = {
        detail: {
          choices: {},
          origin: detail.origin,
          granted: true,
          remember: true
        }
      };
      detail.callback(this.configMediaPermissions(detail, result, true));
    };
    detail.deny = () => {
      var result = {
        detail: {
          choices: {},
          origin: detail.origin,
          granted: false,
          remember: true
        }
      };
      detail.callback(this.configMediaPermissions(detail, result));
    };
    detail.cancel = () => {
      var result = {
        detail: {
          granted: false,
          remember: false
        }
      };
      detail.callback(result);
    };
    detail.name = Service.query('getTopMostWindow').name || '';
    const manifestURL = `${detail.origin}/${window.AppOrigin.getManifestName()}`;
    try {
      await window.AppsManager.getApp(manifestURL).then((result) => {
        detail.isApp = !!result;
      });
    } catch (e) {
      console.log('[PermissionManager]Failed to get app manifest', manifestURL);
      detail.isApp = false;
    }
    if (!Service.query('getTopMostWindow').url.startsWith(evt.detail.origin)) {
      window.DUMP('[PermissionManager]Top most window is changed....');
      return;
    }
    this.requests.push(detail);
    this.handleRequests();
  }

  configMediaPermissions(detail, result, isAllowConfig) {
    if (detail.permissions) {
      var currentChoices = {};
      for (var permission2 in detail.permissions) {
        if (detail.permissions.hasOwnProperty(permission2)) {
          const options = detail.permissions[permission2].options;
          if (options.length > 1 && isAllowConfig &&
            permission2 === 'video-capture') {
            // Check video-capture with front/back options.
            // Then, we can show option menu for camera configuration.
            this._pendingResponse = {
              detail: detail,
              result: result,
              currentChoices: currentChoices,
              permission: permission2
            };
            // Show option menu for select front/back camera.
            Service.request('showOptionMenu', {
              header: 'select',
              options: this._listItems(options),
              onCancel: this.choose.bind(this),
              hasCancel: true
            }, Service.query('getTopMostWindow'));
            // Early return here,
            // Pending to dispatch response until get result from select.
            return;
          } else if (options.length) {
            currentChoices[permission2] = options[0];
          }
        }
      }
      if ('audio-capture' in detail.permissions ||
        'video-capture' in detail.permissions) {
        result.detail.choices = currentChoices;
      }
    }
    return result;
  }

  _listItems(choices) {
    let _ = window.api.l10n.get;
    var items = [];
    choices.forEach((choice, index) => {
      items.push({
        label: _(`${choice}-camera`),
        callback: () => {
          this.choose(index);
        },
        value: index
      });
    });
    return items;
  }

  choose(index = 0) { // default is front camera
    const { currentChoices, permission, result, detail } =
      this._pendingResponse;
    currentChoices[permission] = detail.permissions[permission][index];
    result.detail.choices = currentChoices;
    detail.callback(result);
  }

  _handle_fullscreenchange() {
    // XXX: Maybe not a good place to do it.
    if (!document.mozFullScreen) {
      Service.request('focus');
    }
  }

  '_handle_lockscreen-appopened'() {
    // XXX: Maybe not a good place to do it.
    if (document.mozFullScreen) {
      document.mozCancelFullScreen();
    }
  }

  handleRequests() {
    var current = this.requests.shift();
    if (!current) {
      return;
    }
    var topMost = Service.query('getTopMostWindow').getTopMostWindow();
    if (topMost._permissionDialog) {
      topMost._permissionDialog.show(current);
    } else {
      var overlay = document.createElement('div');
      overlay.classList.add('permission-root');
      topMost.element.appendChild(overlay);
      topMost._permissionDialog = ReactDOM.render(<PermissionDialog app={topMost}/>, overlay);
      topMost._permissionDialog.show(current);
    }
  }
};

var instance = new PermissionManager();
instance.start();

export default instance;
