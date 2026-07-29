import DeviceInfoComposer from './device_info_composer';
import * as utils from './utils';

const ACTIONEVENT = 'evl_action';

class ActionStore {
  save(type, action) {
    return new Promise(resolve => {
      DeviceInfoComposer.getStandardPackage().then(p => {
        utils.debug('save storage', type, action);
        p['event_type'] = type;
        p['data'] = action;

        var evt = new CustomEvent(ACTIONEVENT, {
          detail: p,
          bubbles: true,
          cancelable: false
        });
        window.dispatchEvent(evt);

        resolve();
      });
    });
  }
}

export default ActionStore;