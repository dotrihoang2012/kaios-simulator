import { sendActivity } from './util/utils';

export const EVENT_TYPES = {
  APP_POSITION: 'app_position'
};

const DATASTORE_NAME = 'eventlogger-event';

class EventLogger {

  dataStore = null;

  log(eventObject) {
    if (!eventObject || !eventObject.type) {
      console.warn('EventLogger: Invalid event logging parameter.');
      return;
    }

    switch (eventObject.type) {
      case EVENT_TYPES.APP_POSITION: {
        const activityData = {
          event_type: EVENT_TYPES.APP_POSITION,
          starting_position: eventObject.starting_position,
          end_position: eventObject.end_position,
          app_id: eventObject.app_id,
          app_version: eventObject.app_version
        };
        if (document.hidden) {
          navigator.serviceWorker.controller &&
            navigator.serviceWorker.controller.postMessage({
              isWebActivity: true,
              name: DATASTORE_NAME,
              detail: activityData
            });
        } else {
          sendActivity({
            name: DATASTORE_NAME,
            data: activityData
          })
          .catch((err) => console.error('Send eventLog activity err!', err));
        }
        break;
      }
      default:
        console.warn('Invalid event logging type.');
        break;
    }
  }
}

export const eventLogger = new EventLogger();
