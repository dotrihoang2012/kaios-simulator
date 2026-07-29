import React from 'react';
import ReactDOM from 'react-dom';
import SoftKeyStore from 'soft-key-store';
import BaseComponent from 'base-component';
import '../scss/media_notification.scss';

export default class MediaNotification extends BaseComponent {
  name = 'MediaNotification';

  EVENT_PREFIX = 'media-notification-';

  manifestUrl = window.AppOrigin.getManifestURL('music');

  // When prev/next button releases, we need to know user simply clicking on it
  // or holding on and perform fastseeking. Keeping this state to know which
  // command should issue.
  isFastSeeking = false;

  constructor(props) {
    super(props);
    this.state = {
      'appinfo': null,
      'nowplaying': {
        title: '',
        artist: '',
        album: ''
      },
      'status': null
    }
  }

  componentDidMount() {
    this.element = ReactDOM.findDOMNode(this);
    Service.register('show', this);
    Service.register('hide', this);
    this.hide();
    window.addEventListener('iac-mediacomms', this);
    window.addEventListener('appterminated', this);
    // When SCO status changes, we need to adjust the ui of the playback controls
    window.addEventListener(
      'bluetoothprofileconnectionchange', this
    );
    // Listen to the headphoneschange event for monitoring the audio routing.
    var acm = navigator.b2g.audioChannelManager;
    if (acm) {
      acm.addEventListener(
        'headphoneschange', this
      );
    }
  }

  handleHeadphonesChange(event) {
    this.handleAudioRouteChange(event, 'wired');
  }

  sendCommand(command) {
    var port = IACHandler.getPort('mediacomms');
    if (port) {
      port.postMessage({command: command});
    }
  }

  // Because currently the navigator.b2g.audioChannelManager
  // does not provide any api for
  // querying the active headphones/headset(audio routing), so to fit the ux
  // requirement, we have to monitor the wired headphones and bluetooth headset
  // statuses in system, then decide if we want to pause the music player after
  // one of the headphones/headset is disconnected.
  // We should move this logic back to shared/js/media/remote_controls.js since
  // the remote logics should be handled in remote controls module.
  handleAudioRouteChange(event, reason) {
    var isWiredHeadphonesConnected = false;
    var isBluetoothHeadsetConnected = false;

    if (reason === 'wired') {
      isWiredHeadphonesConnected = event.target.headphones;
    } else {
      isBluetoothHeadsetConnected = event.detail.connected;
    }

    // Save the audio routing when one of the headphones/headset is connected.
    if (isWiredHeadphonesConnected || isBluetoothHeadsetConnected) {
      this.audioRouting = isWiredHeadphonesConnected ? 'wired' : 'bluetooth';
    } else {
      // Check if it's disconnecting the active headphones/headset.
      // If so, then send pause command via IAC to notify the music app.
      if (reason === this.audioRouting) {
        this.sendCommand('pause');
      } else if (reason !== 'wired' && reason !== 'bluetooth') {
        throw Error('Not audio route changed from wired or bluetooth!');
      }

      isWiredHeadphonesConnected = navigator.b2g.audioChannelManager &&
        navigator.b2g.audioChannelManager.headphones;
      isBluetoothHeadsetConnected = !!navigator.b2g.bluetooth &&
        Bluetooth.isProfileConnected(Bluetooth.Profiles.A2DP);

      // Save the correct audio routing for next unplugged/disconnected event
      if (isWiredHeadphonesConnected) {
        this.audioRouting = 'wired';
      } else if (isBluetoothHeadsetConnected) {
        this.audioRouting = 'bluetooth';
      } else {
        this.audioRouting = 'speaker';
      }
    }
  }


  '_handle_bluetoothprofileconnectionchange'(evt) {
    if (!navigator.b2g.bluetooth) {
      return;
    }
    var name = evt.detail.name;
    var connected = evt.detail.connected;

    if (name === Bluetooth.Profiles.SCO) {
      this.element.classList.toggle('disabled', connected);
    } else if (name === Bluetooth.Profiles.A2DP) {
      this.handleAudioRouteChange(event, 'bluetooth');
    }
  }

  '_handle_iac-mediacomms'(event) {
    var message = event.detail;
    var state = {};
    state[message.type] = message.data;
    this.setState(state);
  }

  _handle_appterminated(evt) {
    if (evt.detail.manifestUrl === this.manifestUrl) {
      this.hide();
    }
  }

  openMediaApp() {
    if (this.manifestUrl) {
      var evt = new CustomEvent('displayapp', {
        bubbles: true,
        cancelable: true,
        detail: appWindowManager.getApp(this.manifestUrl)
      });
      window.dispatchEvent(evt);
    }
  }

  onKeyDown(evt) {
    var handled = false;
    switch (evt.key) {
      case 'Enter':
        this.openMediaApp();
        break;
      case 'SoftRight':
        this.sendCommand(this.state.status.playStatus === 'PAUSED' ? 'play' : 'pause');
        handled = true;
        break;
      default:
        handled = false;
        break;
    }
    if (handled) {
      evt.preventDefault();
      evt.stopPropagation();
    }
  }

  /**
   * Per design we will not show on notification but still needs
   * to have the playing state.
   * @type {Boolean}
   */
  PREVENTING_SHOWN = true;

  componentDidUpdate() {
    if (!this.state.status || this.PREVENTING_SHOWN) {
      this.hide();
      return;
    }
    switch (this.state.status.playStatus) {
      case 'PLAYING':
        this.show();
        SoftKeyStore.register({
          center: 'icon=ok',
          right: 'mediaPlaybackPause'
        }, this.element);
        break;
      case 'PAUSED':
        this.show();
        SoftKeyStore.register({
          center: 'icon=ok',
          right: 'mediaPlaybackPlay'
        }, this.element);
        break;
      case 'STOPPED':
        this.hide();
        break;
      case 'mozinterruptbegin':
        this.hide();
        break;
    }
  }

  render() {
    var header = '';
    var text = '';
    return <div data-type="desktop-notification"
        onKeyDown={(e)=>this.onKeyDown(e)}
        data-obsolete-a-p-i="false"
        data-no-clear="false"
        data-dissmisable="false"
        data-notification-id="fm"
        tabIndex="0" role="link" className="notification list-item navigable media-notification" lang="">
        <img className="icon" role="presentation"
          src={`${window.AppOrigin.getOrigin('system')}/style/icons/music.png`} />
        <div className="content">
          <div dir="auto" className="primary">{this.state.nowplaying.title}</div>
          <div dir="auto" className="secondary">{this.state.nowplaying.album}</div>
          <div dir="auto" className="third">{this.state.nowplaying.artist}</div>
        </div>
      </div>
  }
}
