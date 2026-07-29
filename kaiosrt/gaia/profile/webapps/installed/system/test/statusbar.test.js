/* eslint-disable no-undef, global-require */
require('../js/clock.js')

require('./mocks/l10n.js')
require('./mocks/service')
require('./mocks/SettingsObserver')
require('./mocks/simslot_manager')
require('./mocks/external_screen_manager.js')

require('./mocks/navigator/getBattery')
require('./mocks/navigator/getBattery')
require('./mocks/navigator/wifiManager')
require('./mocks/navigator/mobileConnections')

document.body.innerHTML = `
  <!-- Statusbar -->
    <div id="statusbar" data-z-index-level="statusbar">
      <!-- Statusbar icons -->
      <div id="statusbar-icons">
        <div id="statusbar-maximized-wrapper">
          <div id="statusbar-maximized" class="statusbar">
            <div class="statusbar--left">
              <div id="statusbar-notification" hidden="">
                <div class="notification-counts">0</div>
              </div>
              <div id="statusbar-ime" class="sb-icon sb-icon-ime sb-icon-ime" hidden ></div>
              <div id="statusbar-label" class="sb-icon sb-icon-label" hidden></div>
            </div>
            <div class="statusbar--right">
              <!-- General -->
              <div id="statusbar-time" class="sb-icon-time"></div>
              <div id="statusbar-emergency-cb-notification" class="sb-icon sb-icon-emergency-cb-notification" hidden data-icon="callback-emergency"></div>
              <div id="statusbar-battery" class="sb-icon sb-icon-battery" hidden data-icon="battery-0"></div>
              <div id="statusbar-flight-mode" class="sb-icon sb-icon-flight-mode" hidden data-icon="airplane"></div>
              <div id="statusbar-wifi" class="sb-icon sb-icon-wifi" data-level="4" hidden data-icon="wifi-4">
                <div id="statusbar-wifi-permissions" class="sb-icon" data-icon="wifi-permissions"></div>
              </div>
              <div id="statusbar-connections" class="sb-icon-connections sb-icon-group" hidden></div>
              <div id="statusbar-wificall" class="sb-icon sb-icon-wificall" hidden data-icon="vowifi"></div>
              <div id="statusbar-voltecall" class="sb-icon sb-icon-voltecall" hidden data-icon="volte"></div>
              <img id="statusbar-system-downloads" src="style/statusbar/images/system-downloads.png" class="sb-icon-system-downloads" hidden>
              <!-- HACK: We use images instead of divs to enforce allocation of a
                   dedicated layer just for this animated icons, remove after
                   https://bugzil.la/717872 gets fixed -->
              <img id="statusbar-network-activity" src="style/statusbar/images/network-activity.png" class="sb-icon-network-activity" hidden>

              <!-- Connectivity -->
              <div id="statusbar-tethering" class="sb-icon sb-icon-tethering" hidden data-icon="tethering"></div>
              <div id="statusbar-bluetooth" class="sb-icon sb-icon-bluetooth" hidden data-icon="bluetooth"></div>
              <div id="statusbar-bluetooth-headphones" class="sb-icon sb-icon-bluetooth-headphones" hidden data-icon="bluetooth-a2dp"></div>
              <div id="statusbar-bluetooth-transferring" class="sb-icon sb-icon-bluetooth-transferring" hidden data-icon="bluetooth-transfer"></div>
              <div id="statusbar-nfc" class="sb-icon sb-icon-nfc" hidden data-icon="nfc"></div>
              <!-- See note on <img> above. -->
              <div id="statusbar-debugging" data-icon="bug" class="sb-icon sb-icon-debugging" hidden></div>
              <div id="statusbar-usb" class="sb-icon sb-icon-usb" hidden data-icon="usb"></div>
              <div id="statusbar-mute" class="sb-icon sb-icon-mute" hidden data-icon="mute"></div>
              <div id="statusbar-call-forwardings" class="sb-icon-call-forwardings sb-icon-group" hidden></div>
              <div id="statusbar-recording" class="sb-icon sb-icon-recording" hidden data-icon="recording"></div>
              <div id="statusbar-geolocation" class="sb-icon sb-icon-geolocation" hidden data-icon="location"></div>
              <!-- tty mode -->
              <div id="statusbar-tty-mode" class="sb-icon sb-icon-tty-mode" hidden data-icon="tty-mode"></div>
              <div id="statusbar-hac-mode" class="sb-icon sb-icon-hac-mode" hidden data-icon="accessibility-hac"></div>
              <div id="statusbar-headphones" class="sb-icon sb-icon-headphones" hidden data-icon="headphones"></div>
              <div id="statusbar-playing" class="sb-icon sb-icon-playing" hidden data-icon="play"></div>
              <div id="statusbar-alarm" class="sb-icon sb-icon-alarm" hidden data-icon="alarm"></div>
              <!-- dongle connected -->
              <div id="statusbar-dongle" class="sb-icon sb-icon-dongle" hidden data-icon="tv-dongle"></div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
describe('statusbar test', () => {
  beforeAll(done => {
    global.layoutManager = {
      width: window.innerWidth
    };
    global.nfcManager = {
      isActive: () => { return false }
    };
    require('../js/statusbar.js')
    expect(window.statusBar).not.toBe(undefined);
    done();
  });
  beforeEach(done => {
    jest.clearAllMocks()
    done();
  });

  test('finishInit test: ftuopen', (done) => {
    jest.spyOn(window.statusBar, 'handleHacMode');
    jest.spyOn(window.api.l10n, 'DateTimeFormat').mockImplementation(() => {return { localeFormat: jest.fn()}});
    expect(window.statusBar.handleHacMode).toBeCalledTimes(0);
    window.dispatchEvent(new CustomEvent('ftuopen'));
    expect(window.statusBar.handleHacMode).toBeCalledTimes(1);
    done();
  });
  test('finishInit test: ftuskip', (done) => {
    jest.spyOn(window.statusBar, 'handleHacMode');
    jest.spyOn(window.api.l10n, 'DateTimeFormat').mockImplementation(() => {return { localeFormat: jest.fn()}});
    expect(window.statusBar.handleHacMode).toBeCalledTimes(0);
    window.dispatchEvent(new CustomEvent('ftuskip'));
    expect(window.statusBar.handleHacMode).toBeCalledTimes(1);
    done();
  });
  test('StatusBar.height test', (done) => {
    document.mozFullScreen = true;
    expect(window.statusBar.height).toEqual(0);
    document.mozFullScreen = false;
    window.statusBar._cacheHeight = 26;
    expect(window.statusBar.height).toEqual(26);
    done();
  });

  test('StatusBar.updateWifiCallState test', (done) => {
    window.statusBar.updateWifiCallState({ state: 'error', onCall: '' });
    expect(window.statusBar.icons.wificall.dataset.state).toEqual('error');
    expect(window.statusBar.icons.wificall.hidden).toEqual(false);
    expect(window.statusBar.icons.wificall.dataset.oncall).toEqual('false');

    jest.spyOn(window.statusBar.update, 'wificall');
    navigator.b2g.mobileConnections[0].imsHandler.capability = 'video-over-wifi';
    window.statusBar.updateWifiCallState
      ({ state: '', onCall: 'onCall', index: 0 });
    expect(window.statusBar.icons.wificall.dataset.state).toEqual('');
    expect(window.statusBar.icons.wificall.hidden).toEqual(false);
    expect(window.statusBar.icons.wificall.dataset.oncall).toEqual('true');
    expect(window.statusBar.update.wificall).toBeCalledTimes(1);

    navigator.b2g.mobileConnections[0].imsHandler.capability = 'voice-over-cellular';
    window.statusBar.updateWifiCallState({ state: '', onCall: 'onCall' });
    expect(window.statusBar.icons.wificall.hidden).toEqual(true);
    done();
  });

  test('screen off test', (done) => {
    window.dispatchEvent(new CustomEvent('screenchange',
      { detail: { screenEnabled: false }}));
    expect(window.statusBar.active).toEqual(false);
    done();
  });
  test('handle test', (done) => {
    // handle audiochannelchanged
    window.dispatchEvent(new CustomEvent('audiochannelchanged',
      { detail: { channel: 'content' }}));
    expect(window.statusBar.icons.playing.hidden).toEqual(false);

    window.statusBar.recordingActive = true;
    window.dispatchEvent(new CustomEvent('audiochannelchanged',
      { detail: { channel: 'content' }}));
    expect(window.statusBar.icons.playing.hidden).toEqual(true);

    // handle capabilitychange
    navigator.b2g.mobileConnections[0].imsHandler.capability =
      'voice-over-cellular';
    window.statusBar.handleEvent({ type: 'capabilitychange' });
    expect(window.statusBar.icons.voltecall.hidden).toEqual(false);
    expect(window.statusBar.icons.wificall.hidden).toEqual(true);

    navigator.b2g.mobileConnections[0].imsHandler.capability =
      'voice-over-wifi';
    window.statusBar.handleEvent({ type: 'capabilitychange' });
    expect(window.statusBar.icons.voltecall.hidden).toEqual(true);
    expect(window.statusBar.icons.wificall.hidden).toEqual(false);

    // handle emergencycallbackstatechanged
    window.dispatchEvent(new CustomEvent('emergencycallbackstatechanged',
      { detail: { show: true }}));
    expect(window.statusBar.icons.emergencyCbNotification.hidden).toEqual(false);

    window.dispatchEvent(new CustomEvent('emergencycallbackstatechanged',
      { detail: { show: false }}));
    expect(window.statusBar.icons.emergencyCbNotification.hidden).toEqual(true);

    // handle update-notification-count
    window.dispatchEvent(new CustomEvent('update-notification-count',
      { detail: { count: 0, listUnread: true}}));
    expect(window.statusBar.icons.notification.hidden).toEqual(true);

    window.dispatchEvent(new CustomEvent('update-notification-count',
      { detail: { count: 10, listUnread: true}}));
    expect(window.statusBar.icons.notification.hidden).toEqual(false);
    expect(window.statusBar.icons.notification.classList.contains('listUnread')).toBe(true);

    window.dispatchEvent(new CustomEvent('update-notification-count',
      { detail: { count: 20, listUnread: false}}));
    expect(window.statusBar.icons.notification.hidden).toEqual(false);
    expect(window.statusBar.icons.notification.classList.contains('listUnread')).toBe(false);

    // handle chargingchange/levelchange/statuschange/powersupplystatuschanged
    jest.spyOn(window.statusBar.update, 'battery');
    window.statusBar.battery.level = 1;
    navigator.b2g.powerSupplyManager = { powerSupplyOnline: true };
    window.statusBar.handleEvent({ type: 'chargingchange' });
    expect(window.statusBar.icons.battery.dataset.full).toEqual('true');

    window.statusBar.handleEvent({ type: 'levelchange' });
    window.statusBar.handleEvent({ type: 'statuschange' });

    navigator.b2g.powerSupplyManager = { powerSupplyOnline: false };
    window.statusBar.handleEvent({ type: 'powersupplystatuschanged' });
    expect(window.statusBar.update.battery).toBeCalledTimes(4);
    expect(window.statusBar.icons.battery.dataset.full).toEqual('false');

    // handle localized/timeformatchange/timechange
    jest.spyOn(window.statusBar, 'toggleTimeLabel');
    window.dispatchEvent(new CustomEvent('localized'));
    window.dispatchEvent(new CustomEvent('timeformatchange'));
    window.dispatchEvent(new CustomEvent('timechange'));
    expect(window.statusBar.toggleTimeLabel.mock.calls[0][0]).toEqual(false);
    expect(window.statusBar.toggleTimeLabel.mock.calls[1][0]).toEqual(true);
    expect(window.statusBar.toggleTimeLabel.mock.calls[2][0]).toEqual(false);
    expect(window.statusBar.toggleTimeLabel.mock.calls[3][0]).toEqual(true);
    expect(window.statusBar.toggleTimeLabel.mock.calls[4][0]).toEqual(false);
    expect(window.statusBar.toggleTimeLabel.mock.calls[5][0]).toEqual(true);

    // handle keyboard-mode-changed
    window.dispatchEvent(new CustomEvent('keyboard-mode-changed', { detail : {
      mode: 'abc',
      iconText: 'abc_icon',
      activeLayout: 'korean'
    }}));
    expect(window.statusBar.icons.ime.hidden).toEqual(false);
    expect(window.statusBar.icons.ime.textContent).toEqual('abc_icon');

    window.dispatchEvent(new CustomEvent('keyboard-mode-changed', { detail : {
      mode: '123',
      iconText: 'abc_icon',
      activeLayout: 'korean'
    }}));
    expect(window.statusBar.icons.ime.textContent).toEqual('12');

    // handle keyboard-deactivated
    window.dispatchEvent(new CustomEvent('keyboard-deactivated'));
    expect(window.statusBar.icons.ime.hidden).toEqual(true);

    // handle networkupload
    jest.useFakeTimers()
    window.statusBar.icons.data[0].hidden = false;
    window.statusBar.handleEvent({ type: 'networkupload' });
    expect(window.statusBar.icons.dataConnection[0].hidden).toEqual(false);
    jest.advanceTimersByTime(500);
    expect(window.statusBar.icons.dataConnection[0].hidden).toEqual(true);

    // handle networkdownload
    window.statusBar.handleEvent({ type: 'networkdownload' });
    expect(window.statusBar.icons.dataConnection[0].hidden).toEqual(false);
    jest.advanceTimersByTime(500);
    expect(window.statusBar.icons.dataConnection[0].hidden).toEqual(true);

    // handle voicechange
    jest.spyOn(window.statusBar, 'updateSignalIcon');
    SIMSlotManager.getSlots = () => { return [{
      conn: {
        radioState: 'disabled',
        voice: { connected: false },
        data: null
      }}]
    };
    window.statusBar.handleEvent({ type: 'voicechange' });
    expect(window.statusBar.icons.signals[0].dataset.inactive).toEqual('false');

    SIMSlotManager.getSlots = () => { return [{
      isAbsent: () => true,
      conn: {
        radioState: 'enabled',
        voice: { connected: true },
        data: null
      }}]
    };
    window.statusBar.handleEvent({ type: 'voicechange' });

    SIMSlotManager.getSlots = () => { return [{
      isAbsent: () => false,
      conn: {
        radioState: 'enabled',
        voice: { connected: true },
        data: { connected: true, type: 'evdo' }
      }}]
    };
    window.statusBar.handleEvent({ type: 'voicechange' });
    expect(window.statusBar.updateSignalIcon).toBeCalledTimes(1);

    SIMSlotManager.getSlots = () => { return [{
      isAbsent: () => false,
      isLocked: () => true,
      conn: {
        radioState: 'enabled',
        voice: { connected: true, state: 'registered' },
        data: null
      }}]
    };
    window.statusBar.handleEvent({ type: 'voicechange' });
    expect(window.statusBar.icons.signals[0].hidden).toEqual(true);

    SIMSlotManager.getSlots = () => { return [{
      isAbsent: () => false,
      isLocked: () => false,
      conn: {
        radioState: 'enabled',
        voice: { connected: true, state: 'registered' },
        data: null
      }}]
    };
    window.statusBar.handleEvent({ type: 'voicechange' });
    expect(window.statusBar.updateSignalIcon).toBeCalledTimes(2);

    SIMSlotManager.getSlots = () => { return [{
      isAbsent: () => false,
      isLocked: () => false,
      conn: {
        radioState: 'enabled',
        voice: { connected: false, state: 'searching' },
        data: null
      }}]
    };
    window.statusBar.handleEvent({ type: 'voicechange' });

    // handle nfc-state-changed
    window.statusBar.handleEvent({
      type: 'nfc-state-changed',
      detail: { active: true }
    });
    expect(window.statusBar.icons.nfc.hidden).toEqual(false);

    window.statusBar.handleEvent({
      type: 'nfc-state-changed',
      detail: { active: false }
    });
    expect(window.statusBar.icons.nfc.hidden).toEqual(true);

    // handle wifi-stationchange
    window.statusBar.settingValues['tethering.usb.enabled'] = true;
    window.statusBar.handleEvent({
      type: 'wifi-stationchange'
    });
    expect(window.statusBar.icons.tethering.hidden).toEqual(false);

    window.statusBar.settingValues['tethering.usb.enabled'] = false;
    window.statusBar.handleEvent({
      type: 'wifi-stationchange'
    });
    expect(window.statusBar.icons.tethering.hidden).toEqual(true);

    // handle geolocation-status
    window.statusBar.handleEvent({
      type: 'geolocation-status', detail: { active: true }
    });
    expect(window.statusBar.icons.geolocation.hidden).toEqual(false);
    window.statusBar.handleEvent({
      type: 'geolocation-status', detail: { active: false }
    });
    expect(window.statusBar.icons.geolocation.hidden).toEqual(false);
    jest.advanceTimersByTime(window.statusBar.kActiveIndicatorTimeout);
    expect(window.statusBar.icons.geolocation.hidden).toEqual(true);

    // handle mtp-state-changed
    window.statusBar.handleEvent({
      type: 'mtp-state-changed', detail: 'started'
    });
    expect(window.statusBar.icons.usb.hidden).toEqual(false);

    // handle wifi-statuschange
    window.statusBar.settingValues['wifi.enabled'] = true;
    navigator.b2g.wifiManager.connection.status = 'connected'
    window.statusBar.handleEvent({
      type: 'wifi-statuschange'
    });
    expect(window.statusBar.icons.wifi.hidden).toEqual(false);
    navigator.b2g.wifiManager.connection.status = 'connecting'
    window.statusBar.handleEvent({
      type: 'wifi-statuschange'
    });
    expect(window.statusBar.icons.wifi.hidden).toEqual(false);

    window.statusBar.settingValues['wifi.enabled'] = false
    window.statusBar.handleEvent({
      type: 'wifi-statuschange'
    });
    expect(window.statusBar.icons.wifi.hidden).toEqual(true);

    // handle headphones-status-changed
    window.statusBar.handleEvent({
      type: 'headphones-status-changed', detail: 'on'
    });
    expect(window.statusBar.icons.headphones.hidden).toEqual(false);
    window.statusBar.handleEvent({
      type: 'headphones-status-changed', detail: 'off'
    });
    expect(window.statusBar.icons.headphones.hidden).toEqual(true);

    // handle bluetoothprofileconnectionchange
    // handle headphones-status-changed
    global.Bluetooth = {
      isProfileConnected: () => true,
      Profiles: {
        A2DP: 'a2dp',
        OPP: 'opp'
      }
    };
    window.statusBar.handleEvent({
      type: 'bluetoothprofileconnectionchange'
    });
    expect(window.statusBar.icons.bluetoothHeadphones.hidden).toEqual(false);
    global.Bluetooth = {
      isProfileConnected: () => false,
      Profiles: {
        A2DP: 'a2dp',
        OPP: 'opp'
      }
    };
    window.statusBar.handleEvent({
      type: 'bluetoothprofileconnectionchange'
    });
    expect(window.statusBar.icons.bluetoothTransferring.hidden).toEqual(true);
    done();

  });

  test('handle window switch event test', () => {
    jest.spyOn(statusBar, 'setAppearance');
    Service.set('getTopMostUI', { name: 'AppWindowManager' });
    statusBar.element.classList.add('fullscreen-layout');
    window.dispatchEvent(new CustomEvent('homescreenopened'));
    expect(statusBar.setAppearance).toBeCalledTimes(1);
    expect(statusBar.element.classList.contains('fullscreen-layout')).toBe(false);

    window.dispatchEvent(new CustomEvent('appchromecollapsed'));
    expect(statusBar.setAppearance).toBeCalledTimes(2);


    statusBar.element.classList.add('hidden');
    window.dispatchEvent(new CustomEvent('hierarchytopmostwindowchanged'));
    expect(statusBar.setAppearance).toBeCalledTimes(3);
    expect(statusBar.element.classList.contains('hidden')).toBe(false);

    window.dispatchEvent(new CustomEvent('appchromeexpanded'));
    window.dispatchEvent(new CustomEvent('appchromecollapsed'));
    window.dispatchEvent(new CustomEvent('activityopened'));
    window.dispatchEvent(new CustomEvent('activityclosed'));
    window.dispatchEvent(new CustomEvent('apptitlestatechanged'));
    window.dispatchEvent(new CustomEvent('attentiontitlestatechanged'));
    window.dispatchEvent(new CustomEvent('system-option-menu-show'));
    window.dispatchEvent(new CustomEvent('system-option-menu-hide'));
    window.dispatchEvent(new CustomEvent('activitytitlestatechanged'));
    window.dispatchEvent(new CustomEvent('appopening'));
    window.dispatchEvent(new CustomEvent('secure-appopened'));
    expect(statusBar.setAppearance).toBeCalledTimes(14);

    jest.clearAllMocks();
    window.dispatchEvent(new CustomEvent('lockscreen-appopened'));
    expect(statusBar._inLockScreenMode).toBe(true);
    expect(statusBar.setAppearance).toBeCalledTimes(1);

    window.dispatchEvent(new CustomEvent('lockscreen-appclosing'));
    expect(statusBar._inLockScreenMode).toBe(false);
    expect(statusBar.setAppearance).toBeCalledTimes(2);

    jest.clearAllMocks();
    jest.spyOn(statusBar, 'toggleTimeLabel');
    window.dispatchEvent(new CustomEvent('attentionopened'));
    expect(statusBar.toggleTimeLabel).toBeCalledTimes(1);
    window.dispatchEvent(new CustomEvent('attentionclosed'));
    expect(statusBar.toggleTimeLabel).toBeCalledTimes(2);
  });

  test('handle data, call... event test', () => {
    Service.set('hacMode', true)
    window.dispatchEvent(new CustomEvent('hacchange'));
    expect(window.statusBar.icons.hacMode.hidden).toEqual(false);
    Service.set('hacMode', false)
    window.dispatchEvent(new CustomEvent('hacchange'));
    expect(window.statusBar.icons.hacMode.hidden).toEqual(true);

    jest.spyOn(statusBar.update, 'signal');
    jest.spyOn(statusBar.update, 'label');
    jest.spyOn(statusBar.update, 'data');

    window.statusBar.handleEvent({
      type: 'voicechange'
    });
    expect(window.statusBar.update.signal).toBeCalledTimes(1);
    expect(window.statusBar.update.label).toBeCalledTimes(1);

    jest.clearAllMocks();
    window.statusBar.handleEvent({
      type: 'cardstatechange'
    });
    expect(window.statusBar.update.signal).toBeCalledTimes(1);
    expect(window.statusBar.update.label).toBeCalledTimes(1);
    expect(window.statusBar.update.data).toBeCalledTimes(1);

    jest.clearAllMocks();
    window.statusBar.handleEvent({
      type: 'simslot-iccinfochange'
    });
    expect(window.statusBar.update.label).toBeCalledTimes(1);

    jest.clearAllMocks();
    window.statusBar.handleEvent({
      type: 'callschanged'
    });
    expect(window.statusBar.update.signal).toBeCalledTimes(1);
    expect(window.statusBar.update.data).toBeCalledTimes(1);
  });
});
