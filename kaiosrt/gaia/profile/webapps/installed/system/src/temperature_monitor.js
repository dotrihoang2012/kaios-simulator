/* (c) 2017 KAI OS TECHNOLOGIES (HONG KONG) LIMITED All rights reserved. This
 * file or any portion thereof may not be reproduced or used in any manner
 * whatsoever without the express written permission of KAI OS TECHNOLOGIES
 * (HONG KONG) LIMITED. KaiOS is the trademark of KAI OS TECHNOLOGIES (HONG KONG)
 * LIMITED or its affiliate company and may be registered in some jurisdictions.
 * All other trademarks are the property of their respective owners.
 */

import BaseModule from 'base-module';

class TemperatureMonitor extends BaseModule {
  name = 'TemperatureMonitor';

  CHECK_TIME_INTERVAL = 60000;
  HIGHEST_TEMPTERATURE = 63;
  LOWEST_TEMPTERATURE = -23;

  _powersupply = window.navigator.b2g.powerSupplyManager;
  _turnOffTimer = null;

  start() {
    navigator.getBattery().then(battery => {
      this._battery = battery;
      this._battery.addEventListener('batteryhealthchange', this);
      this._handle_batteryhealthchange();
    });
    window.addEventListener('logohidden', this);
  }

  _handle_logohidden() {
    this._handle_batteryhealthchange();
    window.removeEventListener('logohidden', this);
  }

  _handle_batteryhealthchange() {
    if (!this._battery || !this._battery.present) {
      this.clearInterval();
      return;
    }
    var powerSupplyOnline = this._powersupply.powerSupplyOnline;
    if (this._battery.health === 'Overheat') {
      if (powerSupplyOnline) {
        this.showWarningMessage('battery-temperature-high-stop-charging');
      } else {
        this.showWarningMessage('battery-temperature-high');
      }
    } else if (this._battery.health === 'Cold') {
      if (powerSupplyOnline) {
        this.showWarningMessage('battery-temperature-low-stop-charging');
      } else {
        this.showWarningMessage('battery-temperature-low');
      }
    } else {
      this.clearInterval();
    }
  }

  showWarningMessage(msg_id) {
    this.createInterval();
    Service.request('DialogService:show', {
      id: 'temperature-warning',
      header: 'battery-temperature-warning-header',
      content: msg_id,
      ok: 'ok',
      type: 'alert'
    });
  }

  createInterval() {
    this.clearInterval();
    this._turnOffTimer = window.setInterval(() => {
      var temperature = this._battery.temperature;
      if (temperature >= this.HIGHEST_TEMPTERATURE ||
          temperature <= this.LOWEST_TEMPTERATURE) {
        Service.request('startPowerOff', false, 'temperature');
      }
    }, this.CHECK_TIME_INTERVAL);
  }

  clearInterval() {
    window.clearInterval(this._turnOffTimer);
    this._turnOffTimer = 0;
  }
}

var instance = new TemperatureMonitor();
instance.start();

export default instance;
