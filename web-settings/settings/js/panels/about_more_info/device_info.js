/* global SimCardHelper */

define([],function() { // eslint-disable-line
  const DeviceInfo = function DeviceInfo() {
    this.deviceInfoElements = {};
  };

  DeviceInfo.prototype = {
    init: function init(elements) {
      this.deviceInfoElements = elements;

      this.loadImei();
      if (DeviceFeature.getValue('cdmaApn') === 'true') {
        this.loadMeid();
        this.deviceInfoElements.listMeids.hidden = false;
      }
      this.loadIccId();
    },

    getImeiCode: function getImeiCode(simSlotIndex) {
      const deviceInfo = ApiManager.connections[
        simSlotIndex
      ].getDeviceIdentities();

      return Promise.resolve(deviceInfo.imei);
    },

    createImeiField: function createImeiField(imeis) {
      while (this.deviceInfoElements.deviceInfoImeis.hasChildNodes()) {
        this.deviceInfoElements.deviceInfoImeis.removeChild(
          this.deviceInfoElements.deviceInfoImeis.lastChild
        );
      }

      if (!imeis || imeis.length === 0) {
        const span = document.createElement('span');

        span.setAttribute('data-l10n-id', 'unavailable');
        this.deviceInfoElements.deviceInfoImeis.appendChild(span);
      } else {
        imeis.forEach((imei, index) => {
          const span = document.createElement('span');

          if (imeis.length > 1) {
            l10n.setAttributes(span, 'deviceInfo-IMEI-with-index', {
              index: index + 1,
              imei
            });
          } else {
            span.textContent = imei;
          }

          span.dataset.slot = index;
          this.deviceInfoElements.deviceInfoImeis.appendChild(span);
        });
      }
    },

    loadImei: function loadImei() {
      if (!SimCardHelper.hasValidCard()) {
        this.deviceInfoElements.listImeis.hidden = true;
        return;
      }

      const conns = ApiManager.connections;
      // Retrieve all IMEI codes.
      const promises = [];
      for (let i = 0; i < conns.length; i++) {
        promises.push(this.getImeiCode(i));
      }

      Promise.all(promises).then(
        imeis => {
          this.createImeiField(imeis);
        },
        () => {
          this.createImeiField(null);
        }
      );
    },

    getMeidCode: function getMeidCode(simSlotIndex) {
      const deviceInfo = ApiManager.connections[
        simSlotIndex
      ].getDeviceIdentities();

      return Promise.resolve(deviceInfo.meid);
    },

    createMeidField: function createMeidField(meids) {
      while (this.deviceInfoElements.deviceInfoMeids.hasChildNodes()) {
        this.deviceInfoElements.deviceInfoMeids.removeChild(
          this.deviceInfoElements.deviceInfoMeids.lastChild
        );
      }

      let count = 0;
      meids.forEach((meid, index) => {
        /*
         * XXX, meid may be returned a string 'undefined' here which is
         * not correcet, until there's any fix in gecko, use this judge
         * as a workaround.
         */
        if (meid && meid !== 'undefined') {
          count++;
          const span = document.createElement('span');
          if (meids.length > 1) {
            l10n.setAttributes(span, 'deviceInfo-MEID-with-index', {
              index: index + 1,
              meid
            });
          } else {
            span.textContent = meid;
          }

          span.dataset.slot = index;
          this.deviceInfoElements.deviceInfoMeids.appendChild(span);
        }
      });

      if (count === 0) {
        this.deviceInfoElements.listMeids.hidden = true;
      }
    },

    loadMeid: function loadMeid() {
      if (!SimCardHelper.hasValidCard()) {
        this.deviceInfoElements.listMeids.hidden = true;
        return;
      }

      const conns = ApiManager.connections;
      // Retrieve all MEID codes.
      const promises = [];
      for (let i = 0; i < conns.length; i++) {
        promises.push(this.getMeidCode(i));
      }

      Promise.all(promises).then(
        meids => {
          this.createMeidField(meids);
        },
        () => {
          this.createMeidField(null);
        }
      );
    },

    /**
     * Show icc id.
     *
     * @access private
     * @memberOf DeviceInfo.prototype
     */
    loadIccId: function loadIccId() {
      if (!SimCardHelper.hasValidCard() || !ApiManager.telephony) {
        this.deviceInfoElements.listIccIds.hidden = true;
        return;
      }

      const conns = ApiManager.connections;
      const multiSim = conns.length > 1;

      // Update iccids
      while (this.deviceInfoElements.deviceInfoIccIds.hasChildNodes()) {
        this.deviceInfoElements.deviceInfoIccIds.removeChild(
          this.deviceInfoElements.deviceInfoIccIds.lastChild
        );
      }
      Array.prototype.forEach.call(conns, (conn, index) => {
        const span = document.createElement('span');
        if (conn.iccId) {
          if (multiSim) {
            l10n.setAttributes(span, 'deviceInfo-ICCID-with-index', {
              index: index + 1,
              iccid: conn.iccId
            });
          } else {
            span.textContent = conn.iccId;
          }
        } else if (multiSim) {
          l10n.setAttributes(span, 'noSim-with-index-and-colon', {
            index: index + 1
          });
        } else {
          span.setAttribute('data-l10n-id', 'noSimCard');
        }
        this.deviceInfoElements.deviceInfoIccIds.appendChild(span);
      });
    }
  };

  return function deviceInfo() {
    return new DeviceInfo();
  };
});
