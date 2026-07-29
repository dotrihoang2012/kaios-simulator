import React from 'react';
import PropTypes from 'prop-types';

import * as utils from '../util/utils';

import BaseComponent from 'base-component';
import SoftKeyStore from 'soft-key-store';

export default class LockmodePocket extends BaseComponent {
  name = 'LockmodePocket';

  DEBUG = false;

  static defaultProps = {
    unlock: () => {}
  }

  static propTypes = {
    unlock: PropTypes.func
  }

  /**
   * Set closed/opened listeners once mounted
   */
  componentDidMount() {
    this.debug('did mount, should be locked by pocketmode');

    if (this.element) {
      SoftKeyStore.register({
        left: '',
        center: '',
        right: ''
      }, this.element);
    }

    window.document.getElementById('screen').classList.add('locked');
  }

  componentWillUnmount() {
    this.publish('unlocking-stop', null, true);
    SoftKeyStore.unregister(this.element);
    window.document.getElementById('screen').classList.remove('locked');
  }

  onKeyDown(evt) {
    // avoid acting when screen is not enabled
    if (!Service.query('screenEnabled')) {
      return;
    }
    switch (evt.key) {
      case 'Enter':
        this.debug('start unlocking by holding Enter button');
        // for screen manager to reset idle timeout
        this.publish('unlocking-start', null, true);
        this.props.unlock();
        break;
      default:
        this.debug(`onKeyDown: '${evt.key}'`);
        break;
    }
  }

  onKeyUp(evt) {
    switch (evt.key) {
      case 'Enter':
        this.debug('stop unlocking when releasing Enter button');
        // for screen manager to reset idle timeout
        this.publish('unlocking-stop', null, true);
        break;
      default:
        this.debug(`onKeyUp: '${evt.key}'`);
        break;
    }
  }

  render() {
    return <div
            className='pocketmode-view'
            role='presentation'
            ref={ c => this.element = c }
            tabIndex={-1}
            onKeyUp={(e) => this.onKeyUp(e)}
            onKeyDown={(e) => this.onKeyDown(e)}>
            <i className="icon" data-icon="lock" />
            <span>{utils.toL10n('unlock')}</span>
          </div>;
  }

}
