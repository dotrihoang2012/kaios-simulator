import React from 'react';
import ReactDOM from 'react-dom';
import BaseComponent from 'base-component';
import * as utils from './util/utils';

import '../scss/system_toaster.scss';
import EnhanceAnimation from './enhance_animation';

class SystemToaster extends BaseComponent {
  name = 'SystemToaster';

  EVENT_PREFIX = 'system-toaster-';

  TIMEOUT = 3000;
  SHORT_TIMEOUT = 1500;
  latestTimestamp = 0;
  toastQueue = [];
  MAX_QUEUE_LENGTH = 4;

  showNextToast() {
    if (this.toastQueue.length) {
      let config = this.toastQueue.shift();
      this.show(config);
    }
  }

  constructor(props) {
    super(props);
    this.state = {
      title: '',
      text: '',
      titleL10n: '',
      textL10n: '',
      icon: '',
      gaiaIcon: '',
      ariaLabel: '',
      onceFlag: null
    }
  }

  componentDidMount() {
    this.element = ReactDOM.findDOMNode(this.refs.element);
    this.on('closed', () => {
      this.clear();
      this.showNextToast();
    });
    Service.register('show', this);
  }

  componentDidUpdate(prevProps, prevState) {
    let e = this.element.querySelector('.primary div');
    e && utils.ellipsisTextContent(e);
  }

  clear() {
    this.setState({
      title: '',
      text: '',
      titleL10n: '',
      gaiaIcon: '',
      textL10n: '',
      icon: '',
      ariaLabel: '',
      onceFlag: null
    });
  }

  show(config) {
    let timeStamp = performance.now();
    if (this.latestTimestamp && (!config.onceFlag || config.onceFlag !== this.state.onceFlag)) {
      if (timeStamp - this.latestTimestamp < this.SHORT_TIMEOUT) {
        if (this.timer && !this.toastQueue.length) {
          clearTimeout(this.timer);
          this.timer = setTimeout(() => {
            this.timer = null;
            this.close();
            this.latestTimestamp = 0;
          }, this.SHORT_TIMEOUT - (timeStamp - this.latestTimestamp));
        }
        if (this.toastQueue.length >= this.MAX_QUEUE_LENGTH) {
          this.toastQueue.shift();
        }
        this.toastQueue.push(config);
        return;
      }
    }

    if (Service.query('remoteLockEnabled')) {
      return;
    }
    this.clear();
    Service.request('turnScreenOn', 'toast');
    this.setState(config);
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.open();
    this.latestTimestamp = timeStamp;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.close();
      this.latestTimestamp = 0;
    }, this.toastQueue.length ? this.SHORT_TIMEOUT :
      config.timeout ? config.timeout : this.TIMEOUT);
  }

  blur() {

  }

  render() {
    var DOM = '';
    if (this.state.text || this.state.title || this.state.titleL10n || this.state.textL10n) {
      var detail = this.state;
      var titleDOM = '';
      if (this.state.titleL10n) {
        titleDOM = <div className="title primary">{utils.toL10n(detail.titleL10n)}</div>;
      } else if (this.state.title) {
        titleDOM = <div className="title primary">{detail.title}</div>;
      }
      var iconDOM = this.state.icon ?
              <div className="icon">
                <div className="background" />
                <img src={detail.icon || detail.appIcon} />
              </div> : '';
      var gaiaIconDOM = '';
      if (this.state.gaiaIcon) {
        gaiaIconDOM = <i data-icon={this.state.gaiaIcon} className="icon-font" role="presentation" />;
      }
      var bodyDOM = '';
      var bodyClass = 'secondary';
      if (!this.state.titleL10n && !this.state.title) {
        bodyClass = 'primary';
      }
      // When ariaLabel is provided, add aria-hidden to the display text and readout the element with aria-label.
      bodyDOM = <div className={bodyClass}>
                  <div data-l10n-id={this.state.textL10n ? detail.textL10n : ''} aria-hidden={this.state.ariaLabel ? 'true' : 'false'}>
                    {this.state.text ? detail.text : ''}
                  </div>
                  <div aria-label={this.state.ariaLabel ? detail.ariaLabel : ''}></div>
                </div>
      DOM = <div className="container">
              {iconDOM}
              <div className="content">
                {gaiaIconDOM}
                {titleDOM}
                {bodyDOM}
              </div>
           </div>
    }
    return <div id="system-toaster" className={this.state.gaiaIcon ? 'warning' : ''} ref="element">
             {DOM}
           </div>
  }
}

export default EnhanceAnimation(SystemToaster, 'slide-from-top', 'fade-out');
