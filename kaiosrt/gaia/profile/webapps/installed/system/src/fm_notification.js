import React from 'react';
import ReactDOM from 'react-dom';
import BaseComponent from 'base-component';

export default class FMNotification extends BaseComponent {
  name = 'FMNotification';

  EVENT_PREFIX = 'fm-notification-';

  manifestUrl = window.AppOrigin.getManifestURL('fm');

  constructor(props) {
    super(props);
    this.state = {
      notification: null
    }
  }

  componentDidMount() {
    this.element = ReactDOM.findDOMNode(this);
    Service.register('show', this);
    Service.register('hide', this);
    this.hide();
    window.addEventListener('iac-FMRadioComms', this);
    window.addEventListener('appterminated', this);
  }


  /**
   * Per design we will not show on notification but still needs
   * to have the playing state.
   * @type {Boolean}
   */
  PREVENTING_SHOWN = true;

  '_handle_iac-FMRadioComms'(evt) {
    var message = evt.detail;
    if (this.PREVENTING_SHOWN) {
      if (message.action === 'update') {
        this.setState({
          notification: message
        });
      }
      return;
    }
    switch (message.action) {
      case 'update':
        if (!this.isActive()) {
          this.show();
          this.setState({
            notification: message
          });
        }
        break;
      case 'show':
        this.hide();
        break;
      case 'hide':
        this.show();
        break;
      default:
        break;
    }
  };

  _handle_appterminated(evt) {
    if (evt.detail.manifestUrl === this.manifestUrl) {
      this.hide();
    }
  }

  openFMRadio() {
    if (this.manifestUrl) {
      var evt = new CustomEvent('displayapp', {
        bubbles: true,
        cancelable: true,
        detail: appWindowManager.getApp(this.manifestUrl)
      });
      window.dispatchEvent(evt);
    }
  }

  render() {
    var header = '';
    var text = '';
    var notification = this.state.notification;
    if (notification) {
      if (notification.name) {
        header = notification.name;
        text = notification.freq + 'MHZ';
      } else {
        header = notification.freq;
      }
    }
    return <div data-type="desktop-notification"
        data-obsolete-a-p-i="false"
        data-no-clear="false"
        data-dissmisable="false"
        data-notification-id="fm"
        tabIndex="0" role="link" className="notification list-item navigable" lang="">
        <img className="icon" role="presentation"
          src={`${window.AppOrigin.getOrigin('system')}/style/icons/fm.png`} />
        <div className="content">
          <div dir="auto" className="primary">{header}</div>
          <div dir="auto" className="secondary">{text}</div>
        </div>
      </div>
  }
}
