'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import BaseComponent from 'base-component';
import NotificationStore from '../notification_store';

import '../../scss/lockscreen/lockscreen_notification.scss';

export default class LockscreenNotification extends BaseComponent {
  name = 'LockscreenNotification';

  DEBUG = false;

  static defaultProps = {
    enabled: false
  };

  static propTypes = {
    enabled: React.PropTypes.bool
  };

  constructor(props) {
    super(props);
    this.state = {
      badgeCountMap: new Map(),
      hidden: false
    };
    this.MAX_APP_LENGTH = 6;
  }

  componentDidUpdate() {
    if (this.props.enabled) {
      this.show();
    } else {
      this.hide();
    }
  }

  componentDidMount() {
    this.element = ReactDOM.findDOMNode(this);

    window.addEventListener('notification-add-to-lockscreen', (detail) => {
      this.setState({
        badgeCountMap: NotificationStore.newComingCountMap,
      });
    });
    document.addEventListener('visibilitychange', () => {
       if (this.state.badgeCountMap.size) {
         this.setState({
           hidden: document.hidden
         });
       }
    });
  }

  /**
   * Generate DOM by app icon and count
   * @param {string} appName Ex. 'E-Mail', 'Messages'
   * @private
   */
  _DOMFactory(info, appName) {
    return <div className='icon-panel' key={appName}>
        <div className='count'>{info.count}</div>
        <img className="icon" role="presentation" src={info.icon} />
      </div>;
  }

  /**
   * Produce DOMs from icon and count
   */
  render() {
    let doms = [];
    let appLength = 0;
    let countMap = [...this.state.badgeCountMap];
    for (let i = this.state.badgeCountMap.size; i > 0; i--) {
      const info = countMap[i - 1][1];
      if (!info.count) {
        continue;
      }
      const dom = this._DOMFactory(info, countMap[i - 1][0]);
      doms.push(dom);
      if (++appLength === this.MAX_APP_LENGTH) {
        break;
      }
    }
    return <div id="lockscreen-notification"
            className={this.state.hidden ? "hide" : ""}>
            {doms}
           </div>;
  }
}
