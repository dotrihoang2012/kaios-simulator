import React from 'react';
import BaseComponent from 'base-component';
import ReactDialog from 'react-dialog';
import VoiceInputDialog from './voice_input_dialog';
import uuid from './uuid';

export default class DialogService extends BaseComponent {
  name = 'DialogService';

  EVENT_PREFIX = 'dialog-';

  constructor(props) {
    super(props);
    this.state = {
      active: false,
      id: null,
      configs: new Map()
    };
  }

  setHierarchy(value) {
    if (value) {
      if (this.element.contains(document.activeElement)) {
        return;
      }
      this.focus();
    } else {
      // clean up
    }
  }

  focus() {
    this.dialog && this.dialog.focus();
  }

  isActive() {
    return this.state.active;
  }

  componentDidUpdate() {
    if (this.state.active) {
      this.publish('-activated');
      const topMostUI = Service.query('getTopMostUI');
      if (topMostUI && topMostUI.name === 'SystemOptionMenu') {
        Service.request('hideSystemOptionMenu');
      }
      Service.request('focus');
    } else {
      this.publish('-deactivated');
    }
  }

  componentDidMount() {
    Service.register('show', this);
    Service.register('hide', this);
    Service.request('registerHierarchy', this);
    window.addEventListener('hierarchychanged', this);
  }

  _handle_hierarchychanged() {
    if (Service.query('getTopMostWindow') &&
        Service.query('getTopMostWindow').isHomescreen &&
        Service.query('getTopMostUI').name.indexOf('WindowManager') >= 0 &&
        !this.state.active) {
      this.goNextDialog();
    }
  }

  clear() {
    this.setState({
      active: false,
      configs: new Map(),
      id: null
    });
  }

  show(config) {
    if (!config.id) {
      config.id = uuid();
    }
    Service.request('turnScreenOn', 'dialog');
    this.setState((prevState) => {
      let configs = prevState.configs;
      configs.set(config.id, config);
      return {
        active: true,
        id: config.id,
        configs: configs
      };
    }, () => {
      this.dialog.show();
    });
  }

  hide(id) {
    if (id) {
      if (id === this.state.id) {
        this.goNextDialog();
      } else {
        this.state.configs.delete(id);
      }
    } else {
      this.dialog && this.dialog.hide();
    }
  }

  goNextDialog() {
    // no next dialog and current dialog is null
    if (this.state.configs && 0 === Object.keys(this.state.configs).length &&
      !this.dialog) {
      return;
    }

    let current = this.state.id;
    this.setState((prevState) => {
      let next = null;
      let configs = prevState.configs;
      if (prevState.active) {
        configs.delete(current);
      }
      let keys = Array.from(configs.keys());
      if (keys.length) {
        next = keys[keys.length - 1];
      }
      return {
        active: !!next,
        id: next,
        configs: configs
      }
    });
  }

  render() {
    let config = this.state.configs.get(this.state.id);
    return (
      <div id="system-dialog" data-z-index-level="dialog-service"
           className={`${config && 'ime-insert-word' === config.content ?
                       'ime-insert-dialog' : ''}`}
           ref={(dom) => {this.element=dom}}>
        {
          this.state.active && config && config.style === 'ime-ftu' ?
            <VoiceInputDialog
              key={this.state.id}
              ref={(dom) => {this.dialog=dom;}}
              {...config}
              noFocus={false}
              onBlur={() => {this.setState({active:false})}}
              onHide={() => {
                // Wrap onHide if the requester needs to know this event.
                config.onHide && config.onHide();
                this.goNextDialog();
              }}
            /> :
          this.state.active && config ?
            <ReactDialog
              key={this.state.id}
              ref={(dom) => {this.dialog=dom;}}
              {...config}
              noFocus={false}
              onBlur={() => {this.setState({active:false})}}
              onHide={() => {
                // Wrap onHide if the requester needs to know this event.
                config.onHide && config.onHide();
                this.goNextDialog();
              }}
            /> : null
        }
      </div>
    );
  }
}
