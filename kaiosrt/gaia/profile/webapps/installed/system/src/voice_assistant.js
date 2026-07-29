/* (c) 2017 KAI OS TECHNOLOGIES (HONG KONG) LIMITED All rights reserved. This
 * file or any portion thereof may not be reproduced or used in any manner
 * whatsoever without the express written permission of KAI OS TECHNOLOGIES
 * (HONG KONG) LIMITED. KaiOS is the trademark of KAI OS TECHNOLOGIES (HONG KONG)
 * LIMITED or its affiliate company and may be registered in some jurisdictions.
 * All other trademarks are the property of their respective owners.
 */

/* global applications */

import BaseModule from 'base-module';

class VoiceAssistant extends BaseModule {
  name = 'VoiceAssistant';
  hasVoiceAssistant = false;
  _isVAInstalled = false;
  _isVIInstalled = false;
  _selectedVAManifestURL = '';
  _selectedVIManifestURL = '';
  _VAInAppIcon = null;
  _isEnabled = false;
  _assistanttimer = null;

  init() {
    this.getVoiceAssistantActivity();
    this.getVoiceInputActivity();
    this.watchAppEvents();
    this.watchSettings();
  }

  getVoiceAssistantActivity() {
    navigator.b2g.activityUtils
      .getInstalled('voice-assistant')
      .then((activities) => {
        let newIcon = null;
        // Currently, we only have one voice assistant app in the platform now.
        if (activities.length > 0) {
          this.updateEnabled('isVAInstalled', true);
          if (
            activities[0].description &&
            activities[0].description.assistantStyle &&
            activities[0].description.assistantStyle.icon
          ) {
            newIcon = activities[0].description.assistantStyle.icon;
          }
          // Fire icon update event if the icon changed.
          if (this._VAInAppIcon !== newIcon) {
            this._VAInAppIcon = newIcon;
            this.fireIconUpdated();
          }
        } else {
          this.updateEnabled('isVAInstalled', false);
        }
      });
  }

  setVoiceAssistantActivity(app) {
    this._selectedVAManifestURL = app ? app.manifestUrl : '';
    SettingsObserver.setValue([
      {
        name: 'voice-assistant.selected',
        value: this._selectedVAManifestURL,
      },
    ]);
  }

  getVoiceInputActivity() {
    // Currently, we only have one voice input app in the platform now.
    navigator.b2g.activityUtils
      .getInstalled('voice-input')
      .then((activities) => {
        this._isVIInstalled = activities.length > 0;
        SettingsObserver.setValue([
          {
            name: 'voice-input.enabled',
            value: this._isVIInstalled,
          },
        ]);
      });
  }

  setVoiceInputActivity(app) {
    this._selectedVIManifestURL = app ? app.manifestUrl : '';
    SettingsObserver.setValue([
      {
        name: 'voice-input.selected',
        value: this._selectedVIManifestURL,
      },
    ]);
  }

  updateEnabled(type, enabled) {
    const currentState = this.isVAEnabled();
    // saving new enabled state
    this['_' + type] = enabled;
    // Fire enabled updated event if the enabled changed.
    if (currentState !== this.isVAEnabled()) {
      this.fireEnabledUpdated();
    }
  }

  fireEnabledUpdated() {
    window.dispatchEvent(new CustomEvent(
      this.name.toLowerCase() + '-changed', {
      detail: {
        name: 'enabled-updated',
        enabled: this.isVAEnabled()
      }
    }));
  }

  fireIconUpdated() {
    window.dispatchEvent(new CustomEvent(
      this.name.toLowerCase() + '-changed', {
      detail: {
        name: 'icon-updated',
        icon: this.getVAInAppIcon()
      }
    }));
  }

  watchAppEvents() {
    window.addEventListener('applicationinstall', this);
    window.addEventListener('applicationuninstall', this);
    window.addEventListener('applicationupdate', this);
    window.addEventListener('keyboard-activated', this);
    window.addEventListener('keyboard-deactivated', this);
  }

  handleEvent(event) {
    let kaiApp;
    switch (event.type) {
      case 'applicationinstall':
        kaiApp = event.detail.application;
        if ((kaiApp.installState === 0) &&
          (kaiApp.manifest.activities &&
          (kaiApp.manifest.activities.hasOwnProperty('voice-assistant')))) {
          this.getVoiceAssistantActivity();
          this.setVoiceAssistantActivity(kaiApp);
        }
        if ((kaiApp.installState === 0) &&
          (kaiApp.manifest.activities &&
          (kaiApp.manifest.activities.hasOwnProperty('voice-input')))) {
          this.getVoiceInputActivity();
          this.setVoiceInputActivity(kaiApp);
        }
        break;
      case 'applicationupdate':
        // Should we handle update?
        break;
      case 'applicationuninstall':
        kaiApp = event.detail.application;
        if (kaiApp.manifest.activities &&
          kaiApp.manifest.activities.hasOwnProperty('voice-assistant')) {
          this.getVoiceAssistantActivity();
          this.setVoiceAssistantActivity();
        }
        if (kaiApp.manifest.activities &&
          kaiApp.manifest.activities.hasOwnProperty('voice-input')) {
          this.getVoiceInputActivity();
          this.setVoiceInputActivity();
        }
        break;
      case 'keyboard-activated':
      case 'keyboard-deactivated':
        this.cancelVA();
        break;
    }
  }

  watchSettings() {
    const settingKey = 'voice-assistant.enabled';
    SettingsObserver.observe(settingKey, false, (result) => {
      this.updateEnabled('isEnabled', result);
    });
    SettingsObserver.observe('voice-assistant.selected', '', (manifestURL) => {
      this._selectedVAManifestURL = manifestURL;
    });
    SettingsObserver.observe('voice-input.selected', '', (manifestURL) => {
      this._selectedVIManifestURL = manifestURL;
    });
  }

  initialVA() {
    this.cancelVA();
    this._assistanttimer = window.setTimeout(() => {
      this.launchVA();
    }, window.hardwareButtons.HOLD_INTERVAL);
  }

  launchVA() {
    let topMostWindow = Service.query('getTopMostWindow');
    let appName = topMostWindow.manifest ?
      topMostWindow.manifest.name : topMostWindow.config.url;
    if (this.inBlockVAModule() ||
      topMostWindow.isHomescreen ||
      Service.query('KeyboardManager.isActivated')) {
      return;
    }
    const activity = new WebActivity('voice-assistant', {
      from: appName || 'System'
    });
    activity.start();
  }

  cancelVA() {
    window.clearTimeout(this._assistanttimer);
  }

  canResponseVA(evt) {
    if (evt && evt.key === 'MicrophoneToggle') {
      if (!evt.defaultPrevented && evt.type === 'keydown') {
        return !this.inBlockVAModule();
      }
    }
    return false;
  }

  isAttentionScreen() {
    const topMostUI = Service.query('getTopMostUI');
    return topMostUI && topMostUI.name === 'AttentionWindowManager';
  }

  isInstantSettings() {
    const topMostUI = Service.query('getTopMostUI');
    return topMostUI && topMostUI.name === 'InstantSettings';
  }

  isLockScreen() {
    return Service.query('locked');
  }

  isPermissionDialog() {
    const topWindow = Service.query('getTopMostWindow');
    return (
      topWindow &&
      topWindow._permissionDialog &&
      topWindow._permissionDialog.isActive()
    );
  }

  isActivity() {
    const topWindow = Service.query('getTopMostWindow');
    return (
      topWindow && topWindow.isActivity
    );
  }

  isActivitiesOptionMenu() {
    return Service.query('activitiesShowing');
  }

  isFtuRunning() {
    return Service.query('isFtuRunning');
  }

  inBlockVAModule() {
    if (
      this.isAttentionScreen() ||
      this.isInstantSettings() ||
      this.isLockScreen() ||
      this.isPermissionDialog() ||
      this.isActivity() ||
      this.isActivitiesOptionMenu() ||
      this.isFtuRunning()
    ) {
      return true;
    } else {
      return false;
    }
  }

  isVAInstalled() {
    return this._isVAInstalled;
  }

  isVIInstalled() {
    return this._isVIInstalled;
  }

  selectedVAManifestURL() {
    return this._selectedVAManifestURL;
  }

  selectedVIManifestURL() {
    return this._selectedVIManifestURL;
  }

  getVAInAppIcon() {
    return this._VAInAppIcon;
  }

  isVAEnabled() {
    return this._isEnabled && this._isVAInstalled;
  }

  start() {
    if (window.applications.ready) {
      this.init();
    } else {
      window.addEventListener('applicationready', function onAppsReady() {
        window.removeEventListener('applicationready', onAppsReady);
        this.init();
      }.bind(this));
    }
    Service.registerState('canResponseVA', this);
    Service.register('initialVA', this);
    Service.register('launchVA', this);
    Service.register('cancelVA', this);
    Service.registerState('getVAInAppIcon', this);
    Service.registerState('isVAEnabled', this);
    Service.registerState('isVIInstalled', this);
    Service.registerState('selectedVAManifestURL', this);
    Service.registerState('selectedVIManifestURL', this);
  }
}

const instance = new VoiceAssistant();
instance.start();

export default instance;
