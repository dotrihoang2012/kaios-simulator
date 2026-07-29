/* global emitter */
import Service from 'service';

class NetworkHelper {
  constructor() {
    this.shouldFallback = this.fallback;
    this.connected = this.online;
    this.offlineChange = false;
    this.simStatus = [];
  }

  get online() {
    if (this.shouldFallback) {
      return navigator.onLine;
    }
    const { type } = navigator.connection;
    return this.isOnlineNetworkType(type);
  }

  get fallback() {
    if ('connection' in navigator && navigator.connection.type) {
      return false;
    }
    return true;
  }

  isOnline() {
    return new Promise((resolve) => {
      const b2gWifiManager = navigator.b2g.wifiManager;
      if (
        b2gWifiManager &&
        b2gWifiManager.connection &&
        b2gWifiManager.connection.status === 'connected'
      ) {
        resolve(true);
      } else {
        const conns = navigator.b2g.mobileConnections;
        const dataCallMgr = navigator.b2g.dataCallManager;
        let promises = [];
        if (conns && dataCallMgr) {
          Array.prototype.forEach.call(
            conns,
            (conn, index) => {
              if (conn.iccId) {
                promises.push(dataCallMgr.getDataCallState('default', index));
              }
            }
          );
          Promise.all(promises)
            .then((results) => {
              let connectFlag = Array.from(results)
                .find((result) => result === 'connected');
              if (connectFlag) {
                const mainIndex = Service.query('mainSimCardIndex');
                if (this.simStatus.length &&
                  !this.simStatus[mainIndex].carrierName) {
                  connectFlag = false;
                }
              }
              resolve(!!connectFlag);
            })
            .catch(() => resolve(false));
        } else {
          resolve(false);
        }
      }
    });
  }

  isOnlineNetworkType(type) {
    return type === 'cellular' || type === 'wifi';
  }

  addEventListeners() {
    if (this.shouldFallback) {
      window.addEventListener('online', () => {
        this.onNetworkStatusChange(true);
      });
      window.addEventListener('offline', () => {
        this.onNetworkStatusChange(false);
      });
    } else {
      window.navigator.connection.ontypechange = (event) => {
        const online = this.isOnlineNetworkType(event.target.type);
        this.onNetworkStatusChange(online);
      };
    }

    emitter.on('simInfoUpdate', this.simInfoUpdate.bind(this));
  }

  onNetworkStatusChange(online) {
    const event = new CustomEvent('networkstatuschange', {
      detail: {
        online,
      },
    });

    // Add throttling to prevent frequent network status change events.
    clearTimeout(this.statusChangeTimer);
    this.statusChangeTimer = setTimeout(() => {
      window.dispatchEvent(event);
    }, 500);
  }

  simInfoUpdate() {
    const mainIndex = Service.query('mainSimCardIndex');
    if (this.simStatus.length) {
      const newSimStatus = Service.query('simStatus')[mainIndex];
      const oldSimStatus = this.simStatus[mainIndex];
      if (!newSimStatus.signalLevel && oldSimStatus.signalLevel) {
        this.onNetworkStatusChange();
      } else if (!oldSimStatus.signalLevel && newSimStatus.signalLevel) {
        this.isOnline().then((connected) => {
          this.onNetworkStatusChange(connected);
        });
      }
    }
    this.simStatus = Service.query('simStatus');
  }
}

const NetworkHelpers = new NetworkHelper();
export default NetworkHelpers;
