import { isNetworkConnected } from './utils';
import { getRegistrationPayload } from './push_campaign_helper';

class PushCampaignRegistration {
  flags = {
    isFtuFinished: false,
  };
  isRegistering = false;
  retryTimer = null;
  tryRegistrationCounts = 0;

  start() {
    window.addEventListener('ftuskip', this);
    window.addEventListener('ftudone', this);
    this.setupNetworkListener();
  }

  setupNetworkListener() {
    window.addEventListener('simslot-cardstatechange', this);

    const { wifiManager } = navigator.b2g;
    if (wifiManager) {
      wifiManager.addEventListener('wifihasinternet', this);
      wifiManager.addEventListener('disabled', this);
    }

    const { mobileConnections } = navigator.b2g;
    if (mobileConnections) {
      Array.from(mobileConnections).forEach((connection) => {
        connection.addEventListener('datachange', this);
      });
    }
  }

  removeNetworkListener() {
    window.removeEventListener('simslot-cardstatechange', this);

    const { wifiManager } = navigator.b2g;
    if (wifiManager) {
      wifiManager.removeEventListener('wifihasinternet', this);
      wifiManager.removeEventListener('disabled', this);
    }

    const { mobileConnections } = navigator.b2g;
    if (mobileConnections) {
      Array.from(mobileConnections).forEach((connection) => {
        connection.removeEventListener('datachange', this);
      });
    }
  }

  handleEvent(event) {
    switch (event.type) {
      case 'ftuskip':
      case 'ftudone':
        window.removeEventListener('ftuskip', this);
        window.removeEventListener('ftudone', this);
        this.flags.isFtuFinished = true;
        this.handleStatusChange();
        break;
      case 'simslot-cardstatechange':
      case 'datachange':
      case 'wifihasinternet':
      case 'disabled':
        this.handleStatusChange();
        break;
    }
  }

  handleStatusChange() {
    if (!isNetworkConnected()) {
      this.clearRetryTimer();
      this.tryRegistrationCounts = 0;
      return;
    }

    if (this.flags.isFtuFinished) {
      this.handleShowStoreGreeting();
      this.tryRegistration();
    }
  }

  checkRegistrationState() {
    return SettingsObserver.getValue('ftu.storePushRegistration');
  }

  async askForRegistration() {
    this.clearRetryTimer();

    const isRegistered = await this.checkRegistrationState();
    if (isRegistered) {
      // Do nothing if registration has been done.
      return;
    }

    if (this.isRegistering) {
      // Avoid starting activity multiple times.
      return;
    }
    this.isRegistering = true;

    debug('Preparing the push campaign registration..');
    const payload = await getRegistrationPayload();

    debug('Ready to start the activity, payload=', payload);
    const activity = new WebActivity('kaistore-push-register', payload);

    try {
      const response = await activity.start();
      debug('Response from the activity', response);

      if (response) {
        // Stop listening to network changes.
        this.removeNetworkListener();

        // Mark that registration has been done.
        await SettingsObserver.setValue([
          {
            name: 'ftu.storePushRegistration',
            value: true,
          },
        ]);
      } else {
        debug('Registration failed, no response from the activity.');
        this.tryRegistration();
      }
    } catch (err) {
      debug('Failed to start activity, reason=', err);
      this.tryRegistration();
    }

    // Reset the flag.
    this.isRegistering = false;
  }

  handleShowStoreGreeting() {
    window.asyncStorage.getItem(
      'show-store-greeting-done',
      (isGreetingShown) => {
        if (isGreetingShown) return;

        const activity = new WebActivity('kaistore-show-greeting');

        activity
          .start()
          .then((response) => {
            if (response) {
              debug('Response from the activity', response);

              window.asyncStorage.setItem(
                'show-store-greeting-done',
                response
              );
            }
          })
          .catch((err) => {
            debug('Failed to start activity, reason=', err);
          });
      }
    );
  }

  async tryRegistration() {
    debug(`tryRegistration ${this.tryRegistrationCounts}`);

    // call askForRegistration once, if fail then retry 2 times.
    if (this.tryRegistrationCounts < 3) {
      this.tryRegistrationCounts++;
      this.retryTimer = window.setTimeout(() => {
        this.askForRegistration();
      }, 60000);
    } else {
      debug(`retry registration over ${this.tryRegistrationCounts} times, stop.`);
    }
  }

  async clearRetryTimer() {
    if (this.retryTimer) {
      window.clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
  }
}

function debug() {
  console.log('[PushCampaignRegistration]', ...arguments);
}

const instance = new PushCampaignRegistration();
instance.start();

export default instance;
