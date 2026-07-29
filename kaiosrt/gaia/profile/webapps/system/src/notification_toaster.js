/* global Service */
import React from 'react';
import ReactDOM from 'react-dom';
import BaseComponent from 'base-component';
import '../scss/notification_toaster.scss';
import EnhanceAnimation from './enhance_animation';
import * as utils from './util/utils';

class NotificationToaster extends BaseComponent {
  name = 'NotificationToaster';

  EVENT_PREFIX = 'notification-toaster-';

  _sound = window.AppOrigin.getOrigin('shared') +
    '/resources/media/notifications/notifier_shake.ogg';

  TIMEOUT = 5000;

  typeL10nMap = {
    'communications': {
      titleId: 'notice-call-title',
      contentId: 'notice-call-content'
    },
    'sms': {
      titleId: 'notice-message-title',
      contentId: 'notice-message-content'
    },
    'calendar': {
      titleId: 'notice-calendar-title',
      contentId: 'notice-calendar-content'
    },
    'other': {
      titleId: 'notice-other-title',
      contentId: 'notice-other-content'
    }
  };

  constructor(props) {
    super(props);
    this.state = {
      notification: null
    }
  }

  componentDidMount() {
    this.ringtoneURL = new SettingsURL();
    this.element = ReactDOM.findDOMNode(this.refs.element);
    Service.register('show', this);
    SettingsObserver.observe('audio.volume.notification', 0,
      this['_observe_audio.volume.notification'].bind(this));
    SettingsObserver.observe('vibration.enabled', false,
      this['_observe_vibration.enabled'].bind(this));
    SettingsObserver.observe('notification.ringtone', '',
      this['_observe_notification.ringtone'].bind(this));
    window.nt = this;
  }

  show(notification) {
    if (Service.query('remoteLockEnabled')) {
      return;
    }
    Service.request('turnScreenOn', 'notification-toast');
    this.setState({
      notification: notification
    });
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.open();
    this.timer = setTimeout(() => {
      this.timer = null;
      this.hide();
    }, this.TIMEOUT);
  }

  hide() {
    navigator.vibrate(0);
    this.close();
  }

  '_observe_notification.ringtone'(value) {
    this._sound = this.ringtoneURL.set(value);
  }

  '_observe_audio.volume.notification'(value) {
    this.silent = (value === 0);
  }

  '_observe_vibration.enabled'(value) {
    this.vibrationEnabled = value;
  }

  componentDidUpdate() {
    if (!this.state.notification) {
      return;
    }
    let primaryElm = this.element.querySelector('div.primary');
    if (primaryElm) {
      utils.ellipsisTextContent(primaryElm);
    }
    const behavior = this.state.notification.mozbehavior || {};
    // Assign Notification.silent to behavior.
    behavior.silent = this.state.notification.silent;

    if (!this.silent && !behavior.silent) {
      let ringtonePlayer = new Audio();

      if (behavior) {
        ringtonePlayer.src = behavior.soundFile || this._sound;
      } else {
        ringtonePlayer.src = this._sound;
      }
      ringtonePlayer.mozAudioChannelType = 'notification';
      ringtonePlayer.play();
      window.setTimeout(function smsRingtoneEnder() {
        ringtonePlayer.pause();
        ringtonePlayer.removeAttribute('src');
        ringtonePlayer.load();
      }, 2000);
    }

    if (this.vibrationEnabled) {
      let pattern = [200, 200, 200];
      if (behavior) {
        // don't vibrate if Notification.silent is true
        if (behavior.silent) {
          return;
        }
        if (behavior.vibrationPattern && behavior.vibrationPattern.length &&
            behavior.vibrationPattern[0] > 0) {
          pattern = behavior.vibrationPattern;
        }
      }
      navigator.vibrate(pattern);
    }
  }

  convertNoticeContent(detail) {
    let result = {
      title: detail.title,
      text: detail.text,
    };

    if (Service.query('locked') && !Service.query('lockscreenContentShow')) {
      const _ = window.api.l10n.get;
      const appsNameArray = ['communications', 'sms', 'calendar'];
      result.title = _(this.typeL10nMap['other'].titleId);
      result.text = _(this.typeL10nMap['other'].contentId);
      if (detail.manifestURL) {
        const findAppName = appsNameArray.find(appName => {
          return window.AppOrigin.getManifestURL(appName) ===
            detail.manifestURL;
        });
        if (findAppName) {
          result.title = _(this.typeL10nMap[findAppName].titleId);
          result.text = _(this.typeL10nMap[findAppName].contentId);
        }
      }
    }
    return result;
  }

  render() {
    let notification = '';
    if (this.state.notification) {
      let detail = this.state.notification;
      let noticeTag = '';
      let [noticeIcon] = detail.icon.split('?')[0].split('/').slice(-1);
      if (detail.id.includes('#')) {
        let [tagLabel] = detail.id.split('#').slice(-1);
        if (tagLabel.includes(':')) {
          noticeTag = tagLabel.split(':').reverse()[0];
        }
      }
      let sizeDOM = '';
      if (detail.data && detail.data.bluetoothSize) {
        sizeDOM = <span className="secondary-float">{detail.data.bluetoothSize}</span>;
      }
      let iconDOM = '';
      let custIconBg = '';
      let appManifestURL = detail.manifestURL;
      if ((detail.origin === 'null' ||
        detail.origin === window.AppOrigin.getOrigin('system')) &&
        detail.icon.endsWith('Gallery.png')) {
        // Modify the icon background-color in accordance with VsD Spec.
        // The icon background-color is changed by detail.origin, but the appName of screenshot
        // notification is always "System". Therefore, we change the background-color here.
        appManifestURL = window.AppOrigin.getOrigin('gallery') + '/' +
          window.AppOrigin.getManifestName();
        iconDOM = <img src={detail.icon || detail.appIcon} />;
      } else if (noticeTag === 'wificall') {
        custIconBg = '#d90036';
        iconDOM = <i data-icon={noticeIcon} className="icon-font" role="presentation" />;
      // Not blob:xxxx or 'data:image/png;base64,xxxxx or xxxx.xxx or
      // xxxxxxxx?xxxx, use gaia-icon
      } else if (detail.icon && !detail.icon.includes('blob:') &&
        !detail.icon.includes('data:') && !noticeIcon.includes('.')) {
        iconDOM = <i data-icon={noticeIcon} className="icon-font" role="presentation" />;
      } else {
        iconDOM = <img src={detail.icon || detail.appIcon} />;
      }
      let app = applications.getByManifestURL(appManifestURL);
      custIconBg = custIconBg ||
        (app && app.manifest && (app.manifest.focus_color || app.manifest.theme_color)) ||
        'var(--color-purple)';
      let notice = this.convertNoticeContent(detail);
      notification = <div className="container"
                          data-predefined-dir={detail.dir}
                          data-no-clear="false"
                          data-notification-id={detail.id}
                          data-manifest-url={detail.manifestUrl}
                          key={detail.id}>
                        <div className="icon">
                          <div className="background" style={{ backgroundColor: custIconBg }} />
                          {iconDOM}
                        </div>
                        <div className="content">
                          <div className="primary">{notice.title}</div>
                          <div className="secondary"><span>{notice.text}</span>{sizeDOM}</div>
                        </div>
                     </div>
    }
    return <div id="notification-toaster" ref="element">
              {notification}
            </div>
  }
}


export default EnhanceAnimation(NotificationToaster, 'slide-from-top', 'fade-out');
