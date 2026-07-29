import React from 'react';
import ReactDOM from 'react-dom';
import BaseComponent from 'base-component';
import OptionMenu from 'react-option-menu';

export default class SystemOptionMenu extends BaseComponent {
  name = 'SystemOptionMenu';

  EVENT_PREFIX = 'system-option-menu';

  constructor(props) {
    super(props);
    this.state = {
      show: false
    };
    this.publishActived = () => {
      this.publish('-activated');
      if ( this.refs.systemOptionMenu) {
        this.refs.systemOptionMenu.off('opened', this.publishActived);
      }
      this.publish('-show');
    };
    this.publishDeactivated = () => {
      this.publish('-deactivated');
      if ( this.refs.systemOptionMenu) {
        this.refs.systemOptionMenu.off('closed', this.publishDeactivated);
        this.refs.systemOptionMenu.off('blur', this.destroySystemOptionMenu);
      }
      this.publish('-hide');
    };
    this.destroySystemOptionMenu = () => {
      this.hide();
    };
  }

  componentDidMount() {
    window.sop = this;
    Service.register('showSystemOptionMenu', this);
    Service.register('hideSystemOptionMenu', this);
    Service.request('registerHierarchy', this);
    window.addEventListener('screenchange', this);
    window.addEventListener('hierarchytopmostwindowchanged', () => {
      this.hide();
    });
    this.hide();
  }

  _handle_screenchange(evt) {
    if (!evt.detail.screenEnabled) {
      this.hide();
    }
  }

  isActive() {
    return !!(this.refs.systemOptionMenu &&
      this.refs.systemOptionMenu.isActive());
  }

  setHierarchy(value) {
    if (!value) {
      this.hide();
    }
  }

  showSystemOptionMenu(config) {
    if (this.refs.systemOptionMenu) {
      return;
    }
    this.setState({
      show: true
    }, () => {
      this.refs.systemOptionMenu.on('opened', this.publishActived);
      this.refs.systemOptionMenu.on('closed', this.publishDeactivated);
      this.refs.systemOptionMenu.on('blur', this.destroySystemOptionMenu);
      this.refs.systemOptionMenu.show(config);
    });
  }

  hideSystemOptionMenu() {
    this.hide();
  }

  hide() {
    if (this.refs.systemOptionMenu) {
      this.refs.systemOptionMenu.hide();
      this.setState({
        show: false
      });
    }
  }

  render() {
    return this.state.show ? <OptionMenu ref="systemOptionMenu" /> : null;
  }
}
