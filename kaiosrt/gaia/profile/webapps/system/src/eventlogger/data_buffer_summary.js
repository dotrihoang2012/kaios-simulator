import * as utils from './utils';
import { evldb } from './evl_db';
import DeviceInfoComposer from './device_info_composer';

const BUFFER_SENT_SUCCESS = 'buffer_sent_success';

class DataBufferSummary {

  static packSummary() {
    return Promise.all([DeviceInfoComposer.getStandardPackage(),
      DataBufferSummary.getBufferInfo(),
      DataBufferSummary.getBufferAge()]).then(results => {
      var standardPackage = results[0];
      standardPackage['event_type'] = 'buffer_summary';
      var [buffer_payload, buffer_size] = results[1];
      var buffer_age = results[2];
      var data = {};
      data.buffer_payload = buffer_payload;
      data.buffer_size = buffer_size;
      data.buffer_age = buffer_age;
      data.buffer_full = evldb.isFull;
      standardPackage['data'] = data;

      return Promise.resolve(standardPackage);
    }).catch(e => {
      console.error('DataBufferSummary packSummary');
      return Promise.reject();
    })
  }

  static getBufferInfo() {
    return new Promise(resolve => {
      evldb.getAll().then(actions => {
        var data = {};
        var buffer_size = 0;
        var buffer_payload = '';

        actions.forEach(action => {
          var type = action.event_type;
          data[type] ? data[type] += 1 : data[type] = 1;
        });

        var summary = [];
        Object.keys(data).forEach(key => {
          summary.push(key);
          summary.push(data[key]);
        });

        buffer_payload = summary.join(',');
        buffer_size = actions.length;
        utils.debug(buffer_payload);
        utils.debug(buffer_size);

        resolve([buffer_payload, buffer_size]);
      });
    })
  }

  static getBufferAge() {
    return new Promise(resolve => {
      asyncStorage.getItem(BUFFER_SENT_SUCCESS, successTime => {
        var days = -1;
        if (successTime) {
          days = Math.round((Date.now() - successTime) / (1000 * 60 * 60 * 24))
        }

        resolve(days);
      });
    })
  }

}

export default DataBufferSummary;