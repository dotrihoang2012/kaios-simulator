/* global window */

import BaseModule from 'base-module';
import IS_airplanemode from './is_airplanemode';
import IS_bluetooth from './is_bluetooth';
import IS_brightness from './is_brightness';
import IS_flashlight from './is_flashlight';
import IS_network from './is_network';
import IS_volume from './is_volume';
import IS_wifi from './is_wifi';
import IS_keypad_lock from './is_keypad_lock'
import * as utils from '../util/utils';

class InstantSettingsStore extends BaseModule {
  name = 'InstantSettingsStore';

  modules = [
    IS_airplanemode,
    IS_bluetooth,
    IS_brightness,
    IS_flashlight,
    IS_network,
    IS_volume,
    IS_wifi,
    IS_keypad_lock,
  ];
  jio_fallback = [
    {
      config: {
        name: 'system_update',
        jio_icon: {
          init: 'system_update',
        },
        isShortcut: true,
        title: 'software-update',
        order: {
          portrait: 4,
          landscape: 4
        },
        clickType: 'launch',
        click: () => {
          // ToDo: add new app entry for jio fota
        }
      }
    },
  ];
  fallbacks = [
    {
      config: {
        name: 'camera',
        icon: {
          init: 'camera',
        },
        isShortcut: true,
        title: 'camera',
        order: {
          portrait: 5,
          landscape: 5
        },
        clickType: 'launch',
        click: () => {
          this.launchApp(window.AppOrigin.getManifestURL('camera'));
        }
      }
    },
    {
      config: {
        name: 'calculator',
        icon: {
          init: 'calculator',
        },
        isShortcut: true,
        title: 'calculator',
        order: {
          portrait: 5,
          landscape: 5
        },
        clickType: 'launch',
        click: () => {
          this.launchApp(window.AppOrigin.getManifestURL('calculator'));
        }
      }
    },
    {
      config: {
        name: 'settings',
        icon: {
          init: 'settings',
        },
        isShortcut: true,
        title: 'settings',
        order: {
          portrait: 5,
          landscape: 5
        },
        clickType: 'launch',
        click: () => {
          this.launchApp(window.AppOrigin.getManifestURL('settings'));
        }
      }
    },
  ];

  constructor() {
    super();
    this.moduleLength = 7;
    this.settings = this.getSettingsInArray();
    this.modules.forEach((_module) => {
      _module.on('change', this.updateSettings.bind(this));
    }, this);
  }

  toggleAllObservers(active = true) {
    this.modules.forEach((_module) => {
      if (_module.toggleObserver) {
        _module.toggleObserver(active);
      }
    });
  }

  updateSettings() {
    this.emit('change', this.getSettingsInArray());
  }

  getSettingsInArray() {
    if (Service.query('isJioInstantSettings')) {
      var _modules = this.modules.filter((module) => {
        return module.capability &&
          module.name !== 'InstantSettingsStore__Network' &&
          module.name !== 'InstantSettingsStore__Wifi';
      });
      if (_modules.length !== this.moduleLength) {
        _modules = _modules.concat(this.jio_fallback).slice(0, this.moduleLength);
      }
    } else {
      var _modules = this.modules.filter((module) => {
        return module.name !== 'InstantSettingsStore__KeypadLock' && module.capability;
      });
      if (_modules.length !== this.moduleLength) {
        _modules = _modules.concat(this.fallbacks).slice(0, this.moduleLength);
      }
    }
    return _modules.map((module) => module.config).sort(this.sortSettings);
  }

  sortSettings(a, b) {
    let dir = utils.isLandscape ? 'landscape' : 'portrait';
    return a.order[dir] - b.order[dir];
  }

  launchApp(manifestUrl) {
    window.AppsManager.launch(manifestUrl);
  }
}

const instantSettingsStore = new InstantSettingsStore();

export default instantSettingsStore;
