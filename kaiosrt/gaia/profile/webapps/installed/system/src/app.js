/* global Service */

import React from 'react';
import ReactDOM from 'react-dom';
import Requester from 'hawk-requester';

import KeypadBacklightManager from './keypad_backlight_manager';
import NotificationView from './notification_view';
import NotificationToaster from './notification_toaster';
import NotificationDialogView from './notification_dialog_view';
import SoftKeyManager from './soft_key_manager';
import SoftKeyStore from 'soft-key-store';
import Voicemail from './voicemail';
import TemperatureMonitor from './temperature_monitor';
import MediaStorageMonitor from './media_storage_monitor';
import DialogService from './dialog_service';
import OfflineDialog from './offline_dialog';
import OptionMenuRenderer from './option_menu_renderer';
import OtpFetcher from './otp_fetcher';
import PermissionManager from './permission_manager';
import ModalDialogRenderer from './modal_dialog_renderer';
import SystemToaster from './system_toaster';
import BgCallNotice from './bg_call_notice';
import Prompt from './prompt';
import SimDialog from './sim_dialog';
import SimLockStore from './sim_lock_manager';
import SimDialogManager from './sim_dialog_manager';
import LockscreenView from './new_lock_screen_view';
import StkDialog from './stk_dialog';
import SystemOptionMenu from './system_option_menu';
import InstantSettings from './instant_settings/instant_settings';
import DeviceStorageWatcher from './storage_watcher';
import VoiceAssistant from './voice_assistant';
import BrowserMenuManager from './browser/browser_menu_manager.js';
import BrowserSearchView from './browser/browser_search_view.js'
import BrowserPinView from './browser/browser_pin_view.js'
import DMApnSettings from './dm_apn_settings';
import AutoUpdateView from './auto_update_view';
import PushCampaignRegistration from './appstore/push_campaign_registration.js';

import processPriorityManager from './process_priority_manager';
processPriorityManager.start();

import './appstore';
import './metrics_starter';
import './feature_detector';
import '../scss/app.scss';
import '../scss/common.scss';
import './telephony_mirror';
import './timezone';

function reactDomRender() {
  let notificationRoot = document.getElementById('notification-root');
  let notificationToasterRoot =
    document.getElementById('notification-toaster-root');
  let notificationDialogRoot =
    document.getElementById('notification-dialog-root');
  let softKeyRoot = document.getElementById('soft-key-root');

  let dialogRoot = document.getElementById('dialog-root');
  let systemToasterRoot = document.getElementById('system-toaster-root');
  let bgCallNoticeRoot = document.getElementById('bg-call-notice-root');
  let promptRoot = document.getElementById('prompt-root');
  let lockscreenRoot = document.getElementById('lockscreen-root');

  let stkRoot = document.getElementById('stk-root');
  let systemOptionMenuRoot = document.getElementById('system-option-menu-root');
  let instantSettingsRoot = document.getElementById('instant-settings-root');
  let simDialogRoot = document.getElementById('sim-dialog-root');
  let browserMenuRoot = document.getElementById('browser-menu-root');
  let browserSearchRoot = document.getElementById('browser-search-root');
  let browserPinRoot = document.getElementById('browser-pin-root');

  let autoUpdateRoot = document.getElementById('auto-update-root');
  let offlineDialogRoot = document.getElementById('offline-dialog-root');

  if (notificationRoot) {
    ReactDOM.render(<NotificationView />, notificationRoot);
  }
  if (notificationToasterRoot) {
    ReactDOM.render(<NotificationToaster />, notificationToasterRoot);
  }
  if (notificationDialogRoot) {
    ReactDOM.render(<NotificationDialogView />, notificationDialogRoot);
  }
  if (softKeyRoot) {
    ReactDOM.render(<SoftKeyManager />, softKeyRoot);
  }
  if (dialogRoot) {
    ReactDOM.render(<DialogService />, dialogRoot);
  }
  if (systemToasterRoot) {
    ReactDOM.render(<SystemToaster />, systemToasterRoot);
  }
  if (bgCallNoticeRoot) {
    ReactDOM.render(<BgCallNotice />, bgCallNoticeRoot);
  }
  if (promptRoot) {
    ReactDOM.render(<Prompt />, promptRoot);
  }
  if (lockscreenRoot) {
    ReactDOM.render(<LockscreenView />, lockscreenRoot);
  }
  if (stkRoot) {
    ReactDOM.render(<StkDialog />, stkRoot);
  }
  if (systemOptionMenuRoot) {
    ReactDOM.render(<SystemOptionMenu />, systemOptionMenuRoot);
  }
  if (instantSettingsRoot) {
    ReactDOM.render(<InstantSettings />, instantSettingsRoot);
  }
  if (simDialogRoot) {
    ReactDOM.render(<SimDialogManager />, simDialogRoot);
  }
  if (browserMenuRoot) {
    ReactDOM.render(<BrowserMenuManager />, browserMenuRoot);
  }
  if (browserSearchRoot) {
    ReactDOM.render(<BrowserSearchView />, browserSearchRoot);
  }
  if (browserPinRoot) {
    ReactDOM.render(<BrowserPinView />, browserPinRoot);
  }
  if (autoUpdateRoot) {
    ReactDOM.render(<AutoUpdateView />, autoUpdateRoot);
  }
  if (offlineDialogRoot) {
    ReactDOM.render(<OfflineDialog />, offlineDialogRoot);
  }

}
reactDomRender();

// In current timing, many scripts are still running under global and not using ES6 import.
// We need to export SoftKeyStore for these ES5 scripts.
Service.register('register', SoftKeyStore);

Array.slice = (args) => {
  return Array.prototype.slice.call(args);
};

window.Requester = Requester;
