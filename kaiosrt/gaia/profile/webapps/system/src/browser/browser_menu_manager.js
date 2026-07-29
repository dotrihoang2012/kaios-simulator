import React from 'react';
import BaseComponent from 'base-component';
import BrowserTips from './browser_tips.js';
import BrowserOptionsMenu from './browser_options_menu.js';
import '../../scss/browser_menu_manager.scss';

export default class BrowserMenuManager extends BaseComponent {
  name = 'BrowserMenuManager';

  EVENT_PREFIX = 'BrowserMenuManager';

  constructor(props) {
    super(props);
    this.state = {
      active: false,
      type: '',
      options: {}
    };

    window.addEventListener('homescreenopened', this);
    window.addEventListener('activityrequesting', this);
  }

  show(type, options) {
    this.setState({
      type,
      options,
      active: true
    });
  }

  hide() {
    this.setState({
      active: false
    });
  }

  setHierarchy(value) {
    if (value) {
      this.menu && this.menu.focus();
    } else {
      this.hide();
    }
  }

  respondToHierarchyEvent(evt) {
    if (evt.type === 'home' && this.state.active) {
      this.hide();
    }
    return !this.isActive();
  }

  _handle_homescreenopened() {
    this.hide();
  }

  _handle_activityrequesting() {
    this.hide();
  }

  componentDidMount() {
    Service.request('registerHierarchy', this);
    Service.register('show', this);
    Service.register('hide', this);
  }

  isActive() {
    return !!this.state.active;
  }

  componentDidUpdate(nextProps, nextState) {
    if (this.state.active !== nextState.active) {
      if (!this.state.active) {
        this.publish('-deactivated');
      } else {
        this.publish('-activated');
      }
    }
  }

  onClose() {
    this.setState({
      active: false
    });
  }

  render() {
    let menu = null;
    if (this.state.active) {
      if (this.state.type === 'tips') {
        menu = (
          <BrowserTips onClose={() => {this.onClose()}}
            ref={(dom)=>{this.menu=dom}}
          />
        );
      } else {
        menu = (
          <BrowserOptionsMenu onClose={() => {this.onClose()}}
            ref={(dom)=>{this.menu=dom}}
            options={this.state.options}
          />
        );
      }
    }
    return (
      <div id='browser-menu-container' data-z-index-level='browser-menu'
        ref={(dom) => {this.element = dom;}}>
        {menu}
      </div>
    );
  }
}
