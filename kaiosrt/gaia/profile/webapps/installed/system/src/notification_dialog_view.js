import React from 'react';

import SoftKeyStore from 'soft-key-store';
import BaseDialog from 'notice-dialog';
import cond from 'conds';

import EnhanceAnimation from './enhance_animation';
import NotificationStore from './notification_store';
import NotificationComponent from './notification_component';
import { enhanceDialogAnimation } from './notification_dialog_animation';

import '../scss/notification_dialog.scss';

const OVERLAY_DURATION = 150;

const Service = window.Service;
const NoticeDialog = enhanceDialogAnimation(BaseDialog);
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class NotificationDialogView extends NotificationComponent {
  name = 'NotificationDialogView';
  EVENT_PREFIX = 'notice-dialog';
  DEBUG = false;
  _INIT = {
    isOpen: false,
    id: '',
    mozbehavior: {},
    app: {
      icon: '',
      title: ''
    },
    notice: {
      image: '',
      icon: '',
      title: '',
      text: ''
    },
    actions: []
  };

  _handle_visibilitychange() {
    if (this.state.isOpen && document.hidden) {
      this.hide();
    }
  }

  '_handle_ext-screen-state-update'(evt) {
    this._handle_screenchange();
  }

  _handle_screenchange(evt) {
    if (ScreenManager.wakeUpExtScreen) {
      return;
    }
    if (ScreenManager.lidOpened) {
      if (!ScreenManager.screenEnabled) {
        Service.request('NotificationDialogView:hide');
      }
    } else if (!ExternalScreenManager.getState()) {
      Service.request('NotificationDialogView:hide');
    }
  }

  constructor(props) {
    super(props);
    this.state = this._INIT;
    this.onAction = this.onAction.bind(this);
    this.onDismiss = this.onDismiss.bind(this);
    this.onStopRingtoneAndVibration =
      this.onStopRingtoneAndVibration.bind(this);
  }

  get actions() {
    return this.state.actions.slice(0, 2);
  }

  componentDidMount() {
    super.componentDidMount && super.componentDidMount();
    Service.register('show', this);
    Service.register('hide', this);
    Service.register('maybeHide', this);
    Service.request('registerHierarchy', this);
    NotificationStore.on('deleted', (id) => {
      if (this.state.isOpen && id === this.state.id) {
        this.hide();
      }
    });

    window.addEventListener('visibilitychange', this);
    window.addEventListener('screenchange', this);
    window.addEventListener('ext-screen-state-update', this);
    window.nd = this;
  }

  componentWillUnmount() {
    window.removeEventListener('visibilitychange', this);
    window.removeEventListener('screenchange', this);
    window.removeEventListener('ext-screen-state-update', this);
  }

  setHierarchy(value) {
    if (!value || !this.element || this.element.contains(document.activeElement)) {
      return;
    }
    this.focus();
  }

  getSoftKeys(actions=[]) {
    const [action1, action2] = actions;
    return {
      left: action1 ? action1.text : '',
      center: '',
      right: action2 ? action2.text : ''
    };
  }

  mapNotificationActionToDialogAction(id, notificationAction) {
    const { title, action } = notificationAction;
    const callback = () => window.dispatchEvent(
      new CustomEvent('desktop-notification-click', {
        detail: { id, action }
      })
    );
    return { text: title, callback };
  }

  mapDetailToActions(detail) {
    const { id, actions=[] } = detail;

    let dialogActions = [];
    if (actions.length) {
      dialogActions = actions.map((customAction) =>
        this.mapNotificationActionToDialogAction(id, customAction)
      );
    } else {
      const defaultAction = { title: 'dismiss', action: 'dismiss' };
      dialogActions = [this.mapNotificationActionToDialogAction(id, defaultAction)];
    }

    return dialogActions;
  }

  mapDetailToDialog(detail, click=false) {
    let {
      id, mozbehavior={},
      appIcon, manifestURL, image, icon, title, text, actions
    } = detail;

    if (click) {
      mozbehavior.silent = true;
    }
    if (!Service.query('lockscreenContentShow') && Service.query('locked')) {
      const _ = window.api.l10n.get;
      title = _('notice-other-title');
      text = _('notice-other-content');
    }
    const appName = applications.getByManifestURL(manifestURL).manifest.name;
    const app = { icon: appIcon, title: appName };
    const notice = { image, icon, title, text };
    const dialogActions = this.mapDetailToActions({ id, actions });
    return { id, mozbehavior, app, notice, actions: dialogActions };
  }

  closeOverlay() {
    if (!this.state.isOpen) {
      return;
    }
    this.close();
    this.setState({ isOpen: false });
    this.debug('dialog overlay is close');
    window.ExternalScreenManager &&
    window.ExternalScreenManager.send(
      new CustomEvent('interaction-notice-hide', { detail: this.state.id }));
  }

  openOverlay = async() => {
    this.open();
    this.setState({ isOpen: true });
    this.debug('dialog overlay is open');
    await delay(OVERLAY_DURATION);
  }

  closeDialog = async() => {
    if (!this.dialog.isActive()) {
      return;
    }
    await this.dialog.close();
    this.stopVibration();
    this.stopRingtone();
    this.publish('-deactivated')
    this.debug('notice dialog is close');
  }

  openDialog(detail, click) {
    const dialogProps = this.mapDetailToDialog(detail, click);
    const behavior = dialogProps.mozbehavior;
    // Assign Notification.silent to behavior.
    behavior.silent = detail.silent;
    this.setState(dialogProps);
    this.dialog.open();
    this.vibrate(behavior);
    this.playRingtone(behavior);
    this.publish('-activated');
    const topMostUI = Service.query('getTopMostUI');
    if (topMostUI &&
        ((topMostUI.name === 'SystemOptionMenu') ||
        (topMostUI.name === 'SystemUpdateView'))) {
      Service.request('hideSystemOptionMenu');
    }
    this.debug('notice dialog is open');
  }

  maybeHide = async(detail) => {
    const { requireInteraction, id } = detail;
    if (!requireInteraction && id === this.state.id) {
      await this.hide();
    }
  }

  hide = async() => {
    if (!this.state.isOpen) {
      return;
    }
    SoftKeyStore.unregister(this.element);
    await this.closeDialog();
    this.closeOverlay();
  }

  show = async(detail, click=false) => {
    this.state.isOpen
      ? await this.closeDialog()
      : await this.openOverlay();

    this.openDialog(detail, click);
    SoftKeyStore.register(this.getSoftKeys(this.actions), this.element);

    if (click) {
      this.focus();
    }
  }
  onAction(index, evt) {
    const actions = this.actions;
    if (actions.length <= index) {
      return;
    }

    const action = actions[index];
    evt.stopPropagation();
    evt.preventDefault();
    action.callback && action.callback();
    this.hide();
  }

  onDismiss(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    this.hide();
  }

  onStopRingtoneAndVibration(evt) {
    this.stopVibration();
    this.stopRingtone();
    evt.stopPropagation();
    evt.preventDefault();
  }

  onKeyDown(evt) {
    const includes = (array) => (x) => array.includes(x);
    const onAction1 = () => this.onAction(0, evt);
    const onAction2 = () => this.onAction(1, evt);
    const onDismiss = () => this.onDismiss(evt);
    const onStopRingtoneAndVibration =
      () => this.onStopRingtoneAndVibration(evt);
    cond([
      [includes(['SoftLeft']), onAction1],
      [includes(['SoftRight']), onAction2],
      [includes(['BrowserBack', 'Backspace', 'EndCall']), onDismiss],
      [includes(['ArrowDown']), onStopRingtoneAndVibration]
    ])(evt.key);
  }

  render() {
    const { app, notice } = this.state;
    const container = el => this.element = el;
    const dialog = el => this.dialog = el;
    return (
      <div
        id='notification-dialog-container'
        role='presentation'
        ref={container}
        tabIndex={-1}
        className={notice.image ? 'with-image' : ''}
        onKeyDown={(e) => this.onKeyDown(e)}
      >
        <NoticeDialog ref={dialog} app={app} notice={notice} />
      </div>
    );
  }
}

export default EnhanceAnimation(NotificationDialogView, 'fade-in', 'fade-out');
