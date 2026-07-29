/* eslint-disable no-undef, global-require */
require('./mocks/l10n.js')
require('./mocks/service')
require('./mocks/asyncStorage')
require('./mocks/SettingsObserver')
require('./mocks/audio_volume_manager')
require('./mocks/ScreenManager')
require('./mocks/external_screen_manager')
require('./mocks/navigator/vibrate')

require('../js/async_semaphore.js')
document.body.innerHTML = `
  <browser id="browser" tabindex="-1"/>
  <div id="screen" aria-hidden="true">
      <div id="system-overlay" data-z-index-level="system-overlay">
        <div id="volume" class="vibration">
          <div id="volume-bar" class="center"></div>
          <div class="volume-title h1"></div>
          <style scoped>
            @import url("style/sound_manager/sound_manager.css");
          </style>
          <label id="volume-level" class="center"></label>
          <div id="info-icon" class="center" data-icon=""></div>
          <div id="info-title"></div>
        </div>
      </div>
  </div>
`
describe('sound_manager test. init', () => {
  beforeAll(() => {
    global.Bluetooth = {
      isProfileConnected: () => true,
      Profiles: {
        A2DP: 'a2dp',
        OPP: 'opp',
        SCO: 'sco'
      }
    };
    jest.useFakeTimers();
    global.navigator.b2g = {};
    require('../js/sound_manager.js')
    expect(Service.registerState).toBeCalledTimes(3);
  });
  beforeEach(() => {
    jest.clearAllMocks()
  });

  test('sound_manager audioVolumeChanged test', () => {
    jest.spyOn(soundManager, 'changeVolume');
    Service.set('getTopMostUI', { name: 'AppWindow' });
    soundManager.audioVolumeChanged(AudioVolumeManager.AudioVolumeState.VOLUME_UP);
    expect(soundManager.changeVolume.mock.calls[0][0]).toEqual(1);
    expect(soundManager.visibility).toEqual(true);
    jest.advanceTimersByTime(soundManager.HIDE_SOUND_DELAY);
    expect(soundManager.visibility).toEqual(false);

    jest.spyOn(soundManager, 'changeVolume');
    Service.set('getTopMostUI', { name: 'InstantSettings' });
    soundManager.audioVolumeChanged(AudioVolumeManager.AudioVolumeState.VOLUME_DOWN);
    expect(soundManager.changeVolume.mock.calls[1][0]).toEqual(-1);
    expect(soundManager.visibility).toEqual(false);

    jest.spyOn(soundManager, 'changeVolume');
    Service.set('getTopMostUI', { name: 'AppWindow' });
    soundManager.audioVolumeChanged(AudioVolumeManager.AudioVolumeState.VOLUME_SHOW);
    expect(soundManager.changeVolume.mock.calls[2][0]).toEqual(0);
    expect(soundManager.visibility).toEqual(true);
    jest.advanceTimersByTime(soundManager.HIDE_SOUND_DELAY);
    expect(soundManager.visibility).toEqual(false);

    jest.spyOn(soundManager, 'changeVolume');
    Service.set('getTopMostUI', { name: 'AppWindow' });
    soundManager.audioVolumeChanged('test');
    expect(soundManager.changeVolume).toBeCalledTimes(3);
  });

  test('sound_manager getChannel test', () => {
    soundManager.currentChannel = 'telephony';
    expect(soundManager.getChannel()).toEqual('telephony');

    soundManager.currentChannel = 'content';
    navigator.b2g.telephony = { calls: [{ state: 'connected' }]};
    expect(soundManager.getChannel()).toEqual('telephony');

    navigator.b2g.telephony = { calls: [] };
    soundManager.currentChannel = 'content';
    expect(soundManager.getChannel()).toEqual('content');
    soundManager.currentChannel = 'normal';
    expect(soundManager.getChannel()).toEqual('content');

    soundManager.currentChannel = 'alarm';
    expect(soundManager.getChannel()).toEqual('alarm');

    soundManager.currentChannel = 'notification';
    expect(soundManager.getChannel()).toEqual('notification');

    soundManager.currentChannel = 'ringer';
    expect(soundManager.getChannel()).toEqual('notification');

    soundManager.currentChannel = 'none';
    ScreenManager.screenEnabled = true;
    Service.set('getTopMostWindow', { isBrowserOrSearch: ()=>true });
    soundManager.defaultVolumeControlChannel = 'normal'
    expect(soundManager.getChannel()).toEqual('content');

    soundManager.currentChannel = 'none';
    ScreenManager.screenEnabled = false;
    soundManager.defaultVolumeControlChannel = 'normal'
    expect(soundManager.getChannel()).toEqual('content');

    soundManager.defaultVolumeControlChannel = 'testValue';
    expect(soundManager.getChannel()).toEqual('testValue');

    soundManager.defaultVolumeControlChannel = 'unknown';
    expect(soundManager.getChannel()).toEqual('notification');
  });
  test('sound_manager handle test', () => {
    jest.spyOn(soundManager, 'toggleVibrate');
    jest.spyOn(soundManager, 'handleVolumeKey');

    Service.set('getTopMostWindow', { isHomescreen: true });
    Service.set('getTopMostUI', { name: 'AppWindowManager'});
    document.querySelector('#browser').focus();
    expect(soundManager.toggleVibrate).toBeCalledTimes(0);
    window.dispatchEvent(new CustomEvent('holdhash'));
    window.dispatchEvent(new CustomEvent('hold4'));
    expect(soundManager.toggleVibrate).toBeCalledTimes(1);

    window.dispatchEvent(new CustomEvent('volumeup'));
    expect(soundManager.handleVolumeKey).toBeCalledTimes(1);
    expect(soundManager.changeVolume).toBeCalledTimes(1);

    window.dispatchEvent(new CustomEvent('volumedown'));
    expect(soundManager.handleVolumeKey).toBeCalledTimes(2);
    expect(soundManager.changeVolume).toBeCalledTimes(2);

    window.dispatchEvent(new CustomEvent('appopen'));
    expect(soundManager.homescreenVisible).toBe(false);

    soundManager.homescreenVisible = false;
    window.dispatchEvent(new CustomEvent('ftudone'));
    expect(soundManager.homescreenVisible).toBe(true);

    soundManager.homescreenVisible = false;
    window.dispatchEvent(new CustomEvent('homescreenopened'));
    expect(soundManager.homescreenVisible).toBe(true);

    soundManager.homescreenVisible = false;
    window.dispatchEvent(new CustomEvent('homescreenopening'));
    expect(soundManager.homescreenVisible).toBe(true);

    window.dispatchEvent(new CustomEvent('default-volume-channel-changed', {
      detail: 'testChannelValue'
    }));
    expect(soundManager.defaultVolumeControlChannel)
      .toEqual('testChannelValue');

    window.dispatchEvent(new CustomEvent('audiochannelchanged', {
      detail: { channel: 'testChannelValue0' }
    }));
    expect(soundManager.currentChannel).toEqual('testChannelValue0');

    soundManager.isHeadsetConnected = true;
    soundManager.currentVolume['content'] = soundManager.CEWarningVol
    window.dispatchEvent(new CustomEvent('audiochannelchanged', {
      detail: { channel: 'content' }
    }));
    expect(soundManager.currentChannel).toEqual('content');
    expect(soundManager.showCEWarning).toBe(true);

    window.dispatchEvent(new CustomEvent('headphones-status-changed', {
      detail: 'off'
    }));
    expect(soundManager.isHeadsetConnected).toBe(false);

    window.dispatchEvent(new CustomEvent('headphones-status-changed', {
      detail: 'on'
    }));
    expect(soundManager.isHeadsetConnected).toBe(true);

    let expectedVal = 15 - soundManager.currentVolume.bt_sco;
    window.dispatchEvent(new CustomEvent('bluetooth-volumeset', {
      detail: 15
    }));
    expect(soundManager.changeVolume).toBeCalledTimes(3);
    expect(soundManager.changeVolume.mock.calls[2][0])
      .toEqual(expectedVal);
    expect(soundManager.changeVolume.mock.calls[2][1]).toEqual('bt_sco');

    soundManager.allowIncrease = false;
    Service.set('hasVolumeKey', true);
    window.dispatchEvent(new KeyboardEvent('keyup', {'key': 'ArrowUp'}));
    expect(soundManager.allowIncrease).toBe(false);

    Service.set('hasVolumeKey', false)
    window.dispatchEvent(new KeyboardEvent('keyup', {'key': 'ArrowUp'}));
    expect(soundManager.allowIncrease).toBe(true);

    soundManager.allowIncrease = false;
    window.dispatchEvent(new KeyboardEvent('keyup', {'key': 'AudioVolumeDown'}));
    expect(soundManager.allowIncrease).toBe(true);

    soundManager.allowIncrease = false;
    window.dispatchEvent(new KeyboardEvent('keyup', {'key': 'AudioVolumeUp'}));
    expect(soundManager.allowIncrease).toBe(true);

    soundManager.element.classList.add('visible');
    Service.set('getTopMostWindow', { isBrowserOrSearch: ()=>true });
    window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowUp'}));
    expect(AudioVolumeManager.requestUp).toBeCalledTimes(1);

    window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowDown'}));
    expect(AudioVolumeManager.requestDown).toBeCalledTimes(1);
  });

  test('sound_manager handleVolumeKey test', () => {
    navigator.b2g.bluetooth = {};
    soundManager.currentChannel = 'telephony';
    soundManager.handleVolumeKey(5);
    expect(soundManager.changeVolume.mock.calls[0][0]).toEqual(5);
    expect(soundManager.changeVolume.mock.calls[0][1]).toEqual('bt_sco');

    soundManager.currentChannel = 'content';
    soundManager.isHeadsetConnected = true;
    jest.spyOn(soundManager, 'headsetVolumeup');
    soundManager.handleVolumeKey(1);
    expect(soundManager.headsetVolumeup).toBeCalledTimes(1);
    expect(soundManager.changeVolume).toBeCalledTimes(2);

    soundManager.isHeadsetConnected = false;
    soundManager.handleVolumeKey(1);
    expect(soundManager.changeVolume).toBeCalledTimes(3);
  });

  test('sound_manager setMute test', () => {
    jest.spyOn(soundManager, 'enterSilentMode');
    jest.spyOn(soundManager, 'leaveSilentMode');
    soundManager.setMute(true);
    expect(soundManager.enterSilentMode).toBeCalledTimes(1);

    soundManager.setMute(false);
    expect(soundManager.leaveSilentMode).toBeCalledTimes(1);
  });

  test('sound_manager getVibrationAndMuteState test', () => {
    soundManager.vibrationEnabled = false;
    soundManager.currentVolume['notification'] = 0;
    expect(soundManager.getVibrationAndMuteState(1, 'notification'))
      .toEqual('MUTE');
    expect(soundManager.vibrationEnabled).toBe(true);

    expect(soundManager.getVibrationAndMuteState(-1, 'notification'))
      .toEqual('MUTE');
    expect(soundManager.vibrationEnabled).toBe(false);

    expect(soundManager.getVibrationAndMuteState(-1, 'notification'))
      .toEqual('MUTE');
    expect(soundManager.vibrationEnabled).toBe(false);

    soundManager.currentVolume['notification'] = 0;
    soundManager.vibrationEnabled = true;
    soundManager.vibrationUserPrefEnabled = false;
    expect(soundManager.getVibrationAndMuteState(1, 'notification'))
      .toEqual('OFF');
    expect(soundManager.vibrationEnabled).toBe(false);
  });

  test('sound_manager stop test', () => {
    soundManager.stop();
    expect(Service.unregisterState).toBeCalledTimes(3);
  });
});
