/* global BaseModule, SimSettingsHelper, Service */
'use strict';

(function() {
  // Responsible to load and init the sub system for mobile connections.
  var MobileConnectionCore = function(core) {
    this.core = core;
    this.mobileConnections = [];
    navigator.b2g.mobileConnections.forEach(conn => {
      this.mobileConnections.push(conn);
    });
  };
  MobileConnectionCore.SUB_MODULES = [
    'Radio',
    'CallForwarding',
    'EmergencyCallbackManager',
    'EuRoamingManager',
    'TelephonySettings',
    'OperatorVariantManager',
    'InternetSharing',
    'CellBroadcastSystem'
  ];

  MobileConnectionCore.SERVICES = [
    'showWifiCallNotification',
    'clearWifiCallNotification'
  ];

  BaseModule.create(MobileConnectionCore, {
    name: 'MobileConnectionCore',

    _start: function() {
      BaseModule.lazyLoad(['SimSettingsHelper']).then(function() {
        this.debug('lazily load SimSettingsHelper');
        this.simSettingsHelper = SimSettingsHelper;
        this.simSettingsHelper.start();
      }.bind(this));
    },

    // XXX: move to standalone module
    showWifiCallNotification: function(index) {
      if (this.notification) {
        return;
      }
      const conns = navigator.b2g.mobileConnections;
      const imsRegHandler = conns && conns[index] && conns[index].imsHandler;
      var _ = window.api.l10n.get;

      var icon = 'call-wifi-32px';
      this.notification = new Notification(Service.query('isWifiCertified') ?
        _('wifiCallErrorMsg') : _('wlanCallErrorMsg'), {
        body: imsRegHandler.unregisteredReason,
        icon: icon,
        tag: 'wificall'
      });
      this.notification.onclose = () => {
        this.notification = null;
      };
      this.notification.onclick = () => {
        Service.request('updateWifiCallState', { state: '' });
        const settingsAppURL = window.AppOrigin.getManifestURL('settings');
        window.AppsManager.launch(settingsAppURL);
        this.notification.close();
      };
    },

    clearWifiCallNotification: function() {
      this.notification && this.notification.close();
    }
  });
}());
