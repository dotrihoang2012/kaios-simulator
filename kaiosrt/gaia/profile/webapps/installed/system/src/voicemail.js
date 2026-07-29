import BaseModule from 'base-module';

class Voicemail extends BaseModule {
  icon = null;
  notifications = {};
  tagPrefix = 'voicemailNotification:';

  start() {
    const voicemail = navigator.b2g.voicemail;
    if (!voicemail) {
      return;
    }

    this.icon =
      `${window.AppOrigin.getOrigin('system')}/style/icons/voicemail.png`;

    // Cleanup any pending notification and prepare event handler
    return this.setupNotifications();
  };

  handleEvent(evt) {
    console.log(evt);
    var voicemailStatus = evt.status;
    if (voicemailStatus) {
      this.updateNotification(voicemailStatus);
    }
  };

  updateNotification(status) {
    var _ = window.api.l10n.get;
    var title = status.returnMessage;
    var showCount = status.hasMessages && status.messageCount > 0;

    if (!title) {
      title = showCount ? _('newVoicemails', { n: status.messageCount }) :
                          _('newVoicemailsUnknown');
    }

    var text = title;

    // Fetch voicemail number from 'ril.iccInfo.mbdn' settings before
    // looking up |navigator.b2g.voicemail number|.
    // Some SIM card may not provide MBDN info
    // but we could still use settings to overload that.
    SettingsObserver.getValue('ril.iccInfo.mbdn').then((numbers) => {
      const voicemail = navigator.b2g.voicemail;
      var number = numbers && numbers[status.serviceId];

      if (!number && voicemail) {
       number = voicemail.getNumber(status.serviceId);
      }

      if (number) {
        // To prevent '+' sign for displaying on the wrong side of
        // international numbers in RTL mode we add the LRM character.
        // We can remove this when bug 1154438 is fixed.
        number = '\u200E' + number;
        text = _('dialNumber', { number: number });
      }

      if (status.hasMessages) {
        this.showNotification(title, text, number, status.serviceId);
      } else {
        this.hideNotification(status.serviceId);
      }
    });
  };

  showNotification(title, text, voicemailNumber, serviceId) {
    if (!('Notification' in window)) {
      return;
    }

    serviceId = serviceId || 0;

    if (!SIMSlotManager.hasOnlyOneSIMCardDetected()) {
      var _ = window.api.l10n.get;
      title =
        _('voicemailNotificationMultiSim', { n: serviceId + 1, title: title });
    }

    var notifOptions = {
      body: text,
      icon: this.icon,
      tag: this.tagPrefix + serviceId,
      mozbehavior: {
        noclear: true
      }
    };

    var notification = new Notification(title, notifOptions);

    var callVoicemail = function vmNotificationCall_onClick(number) {
      const telephony = navigator.b2g.telephony;
      if (!telephony) {
        return;
      }

      var openLines = telephony.calls.length +
        ((telephony.conferenceGroup &&
        (telephony.conferenceGroup.state ||
        telephony.conferenceGroup.calls.length)) ? 1 : 0);

      // User can make call only when there are less than 2 calls by spec.
      // If the limit reached, return early to prevent holding active call.
      if (openLines >= 2) {
        return;
      }

      telephony.dial(number, 1, false, serviceId);
    };

    var showNoVoicemail = (function vmNotificationNoCall_onClick(event) {
      Service.request('DialogService:show', {
        header: 'voicemailNoNumberTitle',
        content: 'voicemailNoNumberText',
        ok: 'voicemailNoNumberSettings',
        cancel: 'voicemailNoNumberCancel',
        onOk: () => {
          this.showVoicemailSettings();
        },
        type: 'confirm'
      });
    }).bind(this);

    notification.addEventListener('click', () => {
       SettingsObserver.getValue('ril.iccInfo.mbdn').then((numbers) => {
         const voicemail = navigator.b2g.voicemail;
         var number = numbers && numbers[serviceId];

         if (!number && voicemail) {
           number = voicemail.getNumber(serviceId);
         }

         if (number) {
           number = '\u200E' + number;
           callVoicemail(number);
         } else {
           showNoVoicemail();
         }
      });
    });

    notification.addEventListener('close', (function vm_closeNotification(evt) {
      this.notifications[serviceId] = null;
    }).bind(this));

    this.notifications[serviceId] = notification;
  };

  hideNotification(serviceId) {
    if (!this.notifications[serviceId]) {
      return;
    }

    this.notifications[serviceId].close();
  };

  checkVoicemailStatus() {
    SettingsObserver.getValue('notifications.resend').then((value) => {
      if (value) {
        const voicemail = navigator.b2g.voicemail;
        const conns = navigator.b2g.mobileConnections;
        if (!voicemail || !conns) {
          return;
        }

        for (let i = 0; i < conns.length; i++) {
          let voicemailStatus = voicemail.getStatus(i);
          if (voicemailStatus && voicemailStatus.hasMessages) {
            this.updateNotification(voicemailStatus);
          }
        }
      }
    });
  };

  setupNotifications() {
    // Always make sure the initial state is known
    this.notifications = {};
    const voicemail = navigator.b2g.voicemail;
    if (voicemail) {
      voicemail.addEventListener('statuschanged', this);
      this.checkVoicemailStatus();
    }
  };

  showVoicemailSettings() {
    let activity = new WebActivity('voicemail');
    activity.start();
  }
};


var instance = new Voicemail();
window.addEventListener('notification-store-ready', () => {
  instance.start();
}, { once: true });
export default instance;
