import AppStatusCollector from './app_status_collector';
import NetWorkTrafficCollector from './network_traffic_collector';
import DataBufferSummary from './data_buffer_summary';
import SummaryStore from './summary_store';
import * as utils from './utils';

class EventDataManager {
  constructor() {
    this.dataSource = {};
    var collectors = [AppStatusCollector, NetWorkTrafficCollector];
    collectors.forEach((collector) => {
      var cltor = new collector();
      this[cltor.name] = cltor;
      this[cltor.name].start();
      this.dataSource[cltor.name] = this[cltor.name];
    });
  }

  packSummary() {
    return SummaryStore.getStartingTime().then(from => {
      var fromDate = new Date(from);
      // Fail to get starting time, set it as now
      if (from === 0) {
        utils.debug('Failed to get starting time set it as now.');
        fromDate = new Date();
      }
      var p = [];
      Object.entries(this.dataSource).forEach(([name, collector]) => {
        utils.debug('Packing ' + name);
        p.push(collector.packSummary(fromDate));
      });

      p.push(DataBufferSummary.packSummary());
      return Promise.all(p).then(results => {
        var data = [];
        for (var i = 0; i < results.length; i++) {
          if (results[i] && results[i]['data']) {
            results[i]['data'].device_start_time = fromDate.getTime();
            data.push(results[i]);
          }
        }
        // Update start time for next round
        SummaryStore.setNextStartingNow();
        return Promise.resolve(data);
      }).catch(e => {
        utils.debug('event_data_manager packSummary exception');
        return Promise.reject(e);
      })
    });
  }

  stop() {
    Object.entries(this.dataSource).forEach(([name, collector]) => {
      utils.debug('stop ' + name);
      collector.stop && collector.stop();
    })
  }
}
export default EventDataManager;

