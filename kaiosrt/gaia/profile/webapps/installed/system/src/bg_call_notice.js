import React from 'react';
import ReactDOM from 'react-dom';
import BaseComponent from 'base-component';
import * as utils from './util/utils';

import '../scss/bg_call_notice.scss';
import EnhanceAnimation from './enhance_animation';

class BgCallNotice extends BaseComponent {
  name = 'BgCallNotice';

  EVENT_PREFIX = 'bg-call-notice-';

  constructor(props) {
    super(props);
    this.state = {
      title: '',
      text: '',
      titleL10n: '',
      textL10n: '',
      ariaLabel: ''
    }
  }

  componentDidMount() {
    this.element = ReactDOM.findDOMNode(this.refs.element);
    this.on('closed', () => {
      this.clear();
    });
    Service.register('show', this);
    Service.register('close', this);
  }

  componentDidUpdate(prevProps, prevState) {
    let e = this.element.querySelector('.primary div')
    e && utils.ellipsisTextContent(e);
  }

  clear() {
    this.setState({
      title: '',
      text: '',
      titleL10n: '',
      textL10n: '',
      ariaLabel: ''
    });
  }

  show(config) {
    const cmasUrl = window.AppOrigin.getOrigin('network-alerts');
    if (!Service.query('remoteLockEnabled') &&
      attentionWindowManager.isActive() &&
      Service.query('getTopMostWindow').url.startsWith(cmasUrl)) {
      this.clear();
      Service.request('turnScreenOn', 'toast');
      this.setState(config);
      this.open();
    }
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
              <div className="content">
                {titleDOM}
                {bodyDOM}
              </div>
           </div>
    }
    return <div id="bg-call-notice" ref="element">
             {DOM}
           </div>
  }
}

export default EnhanceAnimation(BgCallNotice, 'slide-from-top', 'fade-out');
