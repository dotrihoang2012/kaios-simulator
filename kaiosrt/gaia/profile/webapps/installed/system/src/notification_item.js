import React from 'react';
import ReactDOM from 'react-dom';
import * as utils from './util/utils';

import BaseComponent from 'base-component';
import '../scss/notification_item.scss';

export default class NotificationItem extends BaseComponent {
  componentDidMount() {
    this.element = ReactDOM.findDOMNode(this);
    this.primary = this.element.querySelector('.primary');
    this.isLongText = this.primary.scrollWidth > this.primary.offsetWidth;
    if (this.isLongText) {
      this.primaryText = this.primary.innerText;
      this.scrollWidth = this.primary.scrollWidth;
    }
  }

  componentDidUpdate() {
    if ( this.props.title !== this.primaryText) {
      this.primary.scrollLeft = 0;
      this.primaryText = this.props.title;
      this.isLongText = this.primary.scrollWidth > this.primary.offsetWidth;
      clearTimeout(this.scrollDelay);
      clearTimeout(this.marqueeDelay);
      this.onFocus();
    } else {
      this.primaryText = this.props.title;
      this.isLongText = this.primary.scrollWidth > this.primary.offsetWidth;
    }
  }

  updateTimestamps() {
    Array.from(this.element.querySelectorAll('.timestamp')).forEach(function(dom) {
      var timestamp = +dom.dataset.timestamp;
      if (isNaN(timestamp)) {
        console.error(+dom.dataset.timestamp + ' is not a number.');
        return;
      }
      dom.textContent = this.prettyDate(timestamp);
    }, this);
  };

  /**
   * workaround patch, force to readout the first item
   */
  updateTextContent() {
    let primary = this.element.querySelector('.primary');
    primary && (primary.textContent = primary.textContent);
    let secondary = this.element.querySelector('.secondary span');
    secondary && (secondary.textContent = secondary.textContent);
  };

  /**
   * Display a human-readable relative timestamp.
   */
  prettyDate(timestamp) {
    return utils.timeFormatter_format2(timestamp);
  };

  onFocus() {
    if (window.accessibility &&
      !window.accessibility.settings['accessibility.screenreader'] &&
      this.isLongText) {
      this.marqueeDelay = setTimeout(() => {
        this.primary.style.textOverflow = 'unset';
        this.primary.innerText = this.primary.innerText +
          '\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0'
          + this.primary.innerText;
        this.showMarquee();
      }, 1000);
    }
  }

  onBlur() {
    if (this.isLongText) {
      this.hideMarquee();
    }
  }

  showMarquee() {
    const isRtl = document.dir === 'rtl';
    if ((!isRtl && (this.scrollWidth + 50 - this.primary.scrollLeft > 0)) ||
      (isRtl && (this.scrollWidth + 50 + this.primary.scrollLeft > 0))) {
      if (isRtl) {
        this.primary.scrollLeft = this.primary.scrollLeft - 6;
      } else {
        this.primary.scrollLeft = this.primary.scrollLeft + 6;
      }
      this.scrollDelay = setTimeout( () => {
        this.showMarquee();
      }, 90);
    } else {
      this.hideMarquee();
    }
  }

  hideMarquee() {
    this.primary.innerText = this.primaryText;
    this.primary.style.textOverflow = 'ellipsis';
    this.primary.scrollLeft = 0;
    clearTimeout(this.scrollDelay);
    clearTimeout(this.marqueeDelay);
  }

  render() {
    var detail = this.props;
    var manifestUrl = detail.id.split('#')[0];
    var noticeTag = '';
    var noticeIcon = detail.icon.split('?')[0].split('/').reverse()[0];
    if (detail.id.indexOf('#') !== -1) {
      var tagLabel = detail.id.split('#').reverse()[0];
      if (tagLabel.indexOf(':') !== -1) {
        noticeTag = tagLabel.split(':').reverse()[0];
      }
    }
    var timestamp = detail.timestamp || new Date().getTime();
    var progressDOM = '';
    var thirdaryDOM = '';
    var ignoreTimestamp = detail.ignoreTimestamp || false;
    if (detail.progress !== undefined && detail.progress !== null && detail.type.indexOf('succeeded') < 0) {
      progressDOM = (<div className="progress" style={{ backgroundPosition: `${100 - detail.progress}% 50%` }} />);
    } else if (!ignoreTimestamp) {
      thirdaryDOM = <div data-timestamp={timestamp} className="thirdary timestamp">{this.prettyDate(timestamp)}</div>;
    }
    var iconDOM = '';
    // Not blob:xxxx or 'data:image/png;base64,xxxxx or xxxx.xxx or
    // xxxxxxxx?xxxx, use gaia-icon
    if (detail.icon && !detail.icon.includes('blob:') &&
      !detail.icon.includes('data:') && !noticeIcon.includes('.')) {
      iconDOM = <i data-icon={noticeIcon} className="icon" role="presentation" />;
    } else {
      iconDOM = <img className="icon" role="presentation" src={detail.icon || detail.appIcon} />;
    }
    var sizeDOM = '';
    if (detail.sizeText) {
      sizeDOM = <span aria-hidden={progressDOM ? "true" : "false"} dir="auto" className="secondary-float">{detail.sizeText}</span>;
    } else if (detail.data && detail.data.bluetoothSize) {
      sizeDOM = <span aria-hidden={progressDOM ? "true" : "false"} dir="auto" className="secondary-float">{detail.data.bluetoothSize}</span>;
    }
    return <div data-manifest-u-r-l={manifestUrl}
            onFocus={()=>this.onFocus()}
            onBlur={()=>this.onBlur()}
            role={progressDOM ? "listitem" : "link"}
            data-type={detail.type || "desktop-notification"}
            data-obsolete-a-p-i="false"
            data-predefined-dir={detail.dir}
            data-no-clear="false"
            data-notification-id={detail.id}
            data-dismissable={detail.dismissable.toString()}
            data-inoperable={detail.inoperable}
            tabIndex="0" className="notification list-item navigable" lang="">
            {iconDOM}
            <div className="content">
              <div className="primary">{detail.title}</div>
              <div className="secondary" aria-hidden={progressDOM ? "true" : "false"}>
                <span dir="auto">{detail.text}</span>
                {sizeDOM}
              </div>
              {thirdaryDOM}
            </div>
            {progressDOM}
          </div>
    }
}
