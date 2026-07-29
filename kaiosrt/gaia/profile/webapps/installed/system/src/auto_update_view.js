/* global Service */

import React from 'react';
import BaseComponent from 'base-component';

import '../scss/auto_update_view.scss';

class AutoUpdateView extends BaseComponent {
  name = 'AutoUpdateView';

  EVENT_PREFIX = 'auto-update-view-';

  constructor(props) {
    super(props);
    this.state = {
      isActive: false,
      updateSuccess: false,
      isSystemApp: false
    };
  }

  componentDidMount() {
    Service.register('show', this);
    Service.register('hide', this);
    Service.request('registerHierarchy', this);
  }

  componentDidUpdate(prevProp, prevState) {
    if (prevState.isActive && !this.state.isActive) {
      Service.request('SoftKeyStore:unregister', this.element);
      this.publish('-deactivated');
    }
    if (!prevState.isActive && this.state.isActive) {
      Service.request('SoftKeyStore:register', {
        left: 'hide',
        center: '',
        right: ''
      }, this.element, 'light');
      this.publish('-activated');
    }
  }

  setHierarchy(value) {
    if (value) {
      this.focus();
    }
  }

  isActive() {
    return this.state.isActive
  }

  show(config = {}) {
    const updateSuccess = config.updateSuccess || false;
    const isSystemApp = config.isSystemApp || false;
    this.setState({
      isActive: true,
      updateSuccess: updateSuccess,
      isSystemApp: isSystemApp
    });
  }

  hide() {
    this.setState({
      isActive: false,
      updateSuccess: false
    });
  }

  handleKeyDown = (event) => {
    const { key } = event;
    switch (key) {
      case 'SoftLeft':
        if (this.state.isActive) {
          this.hide();
        }
        break;
      default:
        break;
    }
  }

  render() {
    const { isActive, isSystemApp, updateSuccess } = this.state;
    return (
      <div
        id="auto-update-view"
        className={isActive ? '' : 'hidden'}
        ref={(element) => {
          this.element = element;
        }}
        onKeyDown={this.handleKeyDown}
        tabIndex="-1"
      >
        {
          isActive &&
            <div className="main-wrapper">
              <div className="brick">
                <div
                  className="name"
                  data-l10n-id={
                    isSystemApp ?
                    "multiple-system-apps" : "multiple-regular-apps"
                  }
                />
                {
                  !updateSuccess &&
                    <div className="progress-bar">
                      <div className="indicator" />
                    </div>
                }
              </div>
              <div className="content">
                <div
                  className="title"
                  data-l10n-id={updateSuccess ? "update-success" : "updating"}
                />
                {
                  !updateSuccess &&
                    <div className="tips" data-l10n-id="please-dont-turn-off" />
                }
              </div>
            </div>
        }
      </div>
    );
  }
}

export default AutoUpdateView;
