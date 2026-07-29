import React from 'react';
import BaseComponent from 'base-component';

export default class DeviceFinancingLock extends BaseComponent {
  name = 'DeviceFinancingLock';

  DEBUG = false;

  static defaultProps = {
    softRightHandler: () => {},
    softLeftHandler: () => {}
  }

  /**
   * Set closed/opened listeners once mounted
   */
  componentDidMount() {
    this.debug('did mount, should be locked by device financing');
    window.document.getElementById('screen').classList.add('locked');
    window.addEventListener('screenchange', this);
  }

  componentWillUnmount() {
    this.publish('unlocking-stop', null, true);
    window.document.getElementById('screen').classList.remove('locked');
    window.removeEventListener('screenchange', this);
  }

  _handle_screenchange() {
    if (Service.query('isFtuRunning')) {
      // workaround patch, just to force render UI for bug 96187
      const battery = StatusBar.icons.battery;
      const level = battery.dataset.level;
      battery.removeAttribute('data-level');
      battery.dataset.level = level;
    }
  }

  onKeyDown(evt) {
    if (document.hidden) {
      return;
    }
    switch (evt.key) {
      case 'SoftRight':
        this.props.softRightHandler();
        break;
      case 'SoftLeft':
        this.props.softLeftHandler();
        break;
      default:
        break;
    }
  }

  render() {
    const _ = window.api.l10n.get;
    let contentPri = '';
    let contentSec = '';
    let fullView = false;
    if (this.props.lockStatus === 'inactivation-lock') {
      contentPri = _('df-inactivation-lock');
    } else if (this.props.lockStatus === 'overdue-level3-lock') {
      fullView = true;
      contentPri = _('df-overdue-lock-content-1');
      contentSec = _('df-overdue-lock-content-2');
    } else { // 'overdue-modem-lock'
      fullView = true;
      contentPri = _('df-overdue-modem-lock-content-1');
      contentSec = _('df-overdue-modem-lock-content-2');
    }
    let iconDom = fullView ? <div className="icon" data-icon="alert-32px" /> : '';
    let secDom = contentSec ? <div className='secondary'>{contentSec}</div> : '';
    let priDom = <div className='primary'>{contentPri}</div>

    return <div
             className={fullView ? 'device-financing-view fullview' : 'device-financing-view'}
             onKeyDown={(e)=>this.onKeyDown(e)}
             role='presentation'
             ref={c => this.element = c}
             tabIndex={-1}>
             {iconDom}
             {priDom}
             {secDom}
           </div>;
  }

}
