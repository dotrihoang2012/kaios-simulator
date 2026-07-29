/* global Service, SettingsObserver */
import React from 'react';
import BaseComponent from 'base-component';
import NotificationStore from './notification_store';
import EnhanceAnimation from './enhance_animation';
import SoftKeyStore from 'soft-key-store';
import NotificationItem from './notification_item';
import * as utils from './util/utils';
import '../scss/notification_view.scss';
import SimpleNavigationHelper from 'simple-navigation-helper';

class NotificationView extends BaseComponent {
  name = 'NotificationView';

  EVENT_PREFIX = 'notification-';

  FOCUS_SELECTOR = '.navigable:not(.hidden)';

  /* This is an UI-only state. We will not save it but only calculate from
     the notification store */
  unreadCount = 0;

  constructor(props) {
    super(props);
    this.state = {
      notifications: new Map(),
      ringtone: null
    };
    this.listUnread = true;
    this.read = false;
    window.asyncStorage.getItem('read', (value) => {
      this.read = value;
    });
  }

  setHierarchy(value) {
    if (value) {
      if (this.element.contains(document.activeElement)) {
        return;
      }
      this.element.focus();
    } else {
      // clean up
      Service.request('NotificationView:close');
    }
  }

  componentDidMount() {
    this.sks = SoftKeyStore;
    this.store = NotificationStore;
    SettingsObserver.observe('notification.ringtone', '',
      this.observe.bind(this));
    NotificationStore.on('changed', (detail) => {
      this.updateNotification(detail);
    });
    window.Service.request('registerHierarchy', this);
    window.Service.registerState('unreadCount', this);
    window.Service.registerState('listUnread', this);
    window.Service.registerState('read', this);
    window.Service.register('hideEmcbNotification', this);
    window.Service.register('showEmcbNotification', this);

    this.updateSoftKey();

    [
      'emergencyalert',
      'displayapp',
      'appopening',
      'activityopening',
      'attentionopening',
      'attentionopened',
      'screenchange'
    ].forEach(function(evt) {
      window.addEventListener(evt, () => {
        Service.request('NotificationView:close');
      });
    }, this);

    window.addEventListener('launchapp', this);
    window.addEventListener('timeformatchange', this);
    window.addEventListener('visibilitychange', this);
    this.on('opened', () => {
      this.updateTimestamps();
      this.updateFirstItemTextContent();
      this.listUnread = false;
      const notificationCount = this.state.notifications.size +
        (this.hasOtherNotifications() ? 1 : 0);
      this.saveToStorage('read', true);
      window.dispatchEvent( new CustomEvent('update-notification-count',
        { detail: { count: notificationCount, listUnread: false }}));
    });
    this.on('closed', () => {
      this.listUnread = true;
      this.saveToStorage('read', true);
    });
    this.navigator = new SimpleNavigationHelper(this.FOCUS_SELECTOR, this.element);
    this.element.addEventListener('keypress', this);
  }

  _handle_visibilitychange() {
    if (document.hidden) {
      return;
    }
    this.updateTimestamps();
  }

  _handle_timeformatchange() {
    this.updateTimestamps();
  }

  _handle_keypress(evt) {
    switch (evt.key) {
      case 'ArrowUp':
      case 'ArrowDown':
        evt.stopPropagation();
        evt.preventDefault();
        break;
      default:
        break;
    }
  }

  updateFirstItemTextContent() {
    let lastKey = null;
    for (let key in this.refs) {
      if (key.indexOf('notification-item') >= 0) {
        lastKey = key;
      }
    }
    if (lastKey) {
      this.refs[lastKey].updateTextContent && this.refs[lastKey].updateTextContent();
    }
  }

  updateTimestamps() {
    for (var key in this.refs) {
      if (key.indexOf('notification-item') >= 0) {
        this.refs[key].updateTimestamps && this.refs[key].updateTimestamps();
      }
    }
  }

  hideEmcbNotification() {
    this.updateNotification();
  }

  showEmcbNotification() {
    this.updateNotification();
  }

  updateNotification(detail) {
    this.setState({
      notifications: NotificationStore.getAll()
    });

    var notificationCount = this.state.notifications.size +
      (this.hasOtherNotifications() ? 1 : 0);
    let listUnread = this.listUnread;
    if (Service.query('isResending') || (detail && detail.noNotify)) {
      listUnread = !this.read;
    } else {
      this.saveToStorage('read', !this.listUnread);
    }
    window.dispatchEvent( new CustomEvent('update-notification-count',
      { detail: { count: notificationCount, listUnread: listUnread }}));
  }

  saveToStorage(item, value) {
    try {
      this.read = value;
      window.asyncStorage.setItem(item, value);
    } catch (e) {
      console.error('Failed to save item');
    }
  }

  _handle_launchapp(evt) {
    var detail = evt.detail;
    // We don't want background apps to trigger this event, otherwise,
    // utility tray will be closed accidentally.
    if (detail && detail.stayBackground) {
      return;
    }

    var findMyDevice =
      window.location.origin.replace('system', 'findmydevice');

    var blacklist = [findMyDevice];

    var isBlockedApp = blacklist.some(function(blockedApp) {
      return blockedApp === detail.origin;
    });

    if (!isBlockedApp) {
      Service.request('NotificationView:close');
    }
  }

  updateSoftKey() {
    if (document.activeElement.dataset.dismissable === 'true') {
      if (document.activeElement.dataset.inoperable === 'true') {
        SoftKeyStore.register({
          left: utils.toL10n('clear'),
          right: utils.toL10n('clear-all')
        }, this.element);
      } else {
        SoftKeyStore.register({
          left: utils.toL10n('clear'),
          center: utils.toL10n('select'),
          right: utils.toL10n('clear-all')
        }, this.element);
      }
    } else if (document.activeElement.dataset.type &&
               document.activeElement.dataset.type.startsWith('download')) {
      SoftKeyStore.register({
        center: utils.toL10n('select')
      }, this.element);
    } else if (document.activeElement.dataset.type &&
               document.activeElement.dataset.type.startsWith('bluetooth')) {
      SoftKeyStore.register({
        center: utils.toL10n('stop')
      }, this.element);
    } else {
      SoftKeyStore.register({
        center: document.activeElement.dataset.dismissable ? utils.toL10n('select') : ''
      }, this.element);
    }
  }

  onFocus() {
    this.updateSoftKey();
  }

  hasOtherNotifications() {
    return this.element &&
           (this.element.querySelectorAll('.navigable.fake-notification:not(.hidden)').length > 0);
  }

  isActive() {

  }

  onKeyDown(evt) {
    var handled = false;
    var notificationId = document.activeElement.dataset.notificationId;
    switch (evt.key) {
      case 'Enter':
        if (document.activeElement.dataset.inoperable === 'true') {
          return;
        }

        if (notificationId) {
          NotificationStore.click(notificationId);
          handled = true;
        } else {
          // Fake notification.
          handled = false;
        }
        Service.request('NotificationView:close');
        break;
      case 'SoftRight':
        if (notificationId && document.activeElement.dataset.dismissable === 'false') {
          break;
        }
        NotificationStore.removeAll();
        handled = true;
        break;
      case 'SoftLeft':
        if (notificationId && document.activeElement.dataset.dismissable === 'true') {
          NotificationStore.remove(notificationId);
        }
        handled = true;
        break;
      case 'EndCall':
      case 'BrowserBack':
      case 'Backspace':
        handled = true;
        Service.request('NotificationView:close');
        break;
    }
    if (handled) {
      evt.stopPropagation();
      evt.preventDefault();
    }
  }

  observe(value) {
    this.setState({
      ringtone: value
    });
  }

  blur() {

  }

  componentDidUpdate() {
    if (document.activeElement === document.body) {
      Service.request('focus');
    }
  }

  render() {
    var dom = [];
    [...this.state.notifications.entries()].reverse().forEach((notice) => {
      const detail = notice[1];
      dom.push(
        <NotificationItem {...detail} key={detail.id} ref={'notification-item-' + detail.id} updateSoftKey={this.updateSoftKey.bind(this)} />);
    });
    var content = <div className="content-wrapper">
                  <div className={"header " + ((this.state.notifications.size === 0 && !this.hasOtherNotifications()) ? 'hidden' : '')}>
                    <div className="h1">
                      {utils.toL10n('notification-title-new',
                        {n: this.state.notifications.size + (this.hasOtherNotifications() ? 1 : 0)})
                      }
                    </div>
                  </div>
                  <div className="notification-dialog-container" role="heading" aria-labelledby="notification-dialog-header">
                    <div id="notifications-container">
                      <div id="emergency-callback-notification" tabIndex="0" className="fake-notification list-item navigable hidden" role="link">
                        <i data-icon="callback-emergency" className="icon" aria-hidden="true"></i>
                        <div className="content">
                          <div className="primary" dir="auto" data-l10n-id="emergency-callback-mode"></div>
                          <div className="secondary">
                            <div dir="auto" className="timer"></div>
                          </div>
                        </div>
                      </div>
                      <div id="desktop-notifications-container" className={(this.state.notifications.size === 0) ? 'hidden' : ''}>
                        <div className="priority-notifications" id="priority-notifications"></div>
                        <div className="other-notifications" id="other-notifications">
                          {dom}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

    var nonotice = <div id="notification-dialog-no-notices"
                    className={(this.state.notifications.size > 0 || this.hasOtherNotifications()) ? 'hidden' : '' }>
                    <i data-icon="notification-32px" aria-hidden="true" />
                    <div className="primary" data-l10n-id="notification-dialog-no-notices-new" />
                   </div>
    return <div id="notification-view"
                ref={(dom)=>{this.element=dom}}
                tabIndex="0"
                onKeyDown={(e) => this.onKeyDown(e)}
                onFocus={()=>this.onFocus()}>
                {nonotice}
                {content}
           </div>
  }
}

export default EnhanceAnimation(NotificationView, 'fade-in', 'fade-out');
