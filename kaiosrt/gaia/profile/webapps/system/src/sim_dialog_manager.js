import React from 'react';
import BaseComponent from 'base-component';
import SimLockStore from './sim_lock_manager';
import SimDialog from './sim_dialog';

export default class SimDialogManager extends BaseComponent {
  name = 'SimDialogManager';

  EVENT_PREFIX = 'SimDialogManager';

  constructor(props) {
    super(props);
    this.state = {
      active: SimLockStore.state.active,
      slots: SimLockStore.state.slots,
      nckSkipButton: SimLockStore.state.nckSkipButton,
      showAttentionInNck: SimLockStore.state.showAttentionInNck
    };
  }

  setHierarchy(value) {
    if (value) {
      this.dialog && this.dialog.focus();
    }
  }

  componentDidMount() {
    window.addEventListener('screenchange', (evt) => {
      if (!evt.detail.screenEnabled && this.state.active) {
        this.dialog.clearInput();
      }
    });
    SimLockStore.on('changed', () => {
      if (!SimLockStore.state.active &&
        this.element.contains(document.activeElement)) {
        document.activeElement.blur();
      }
      this.setState({
        slots: SimLockStore.state.slots,
        active: SimLockStore.state.active,
        nckSkipButton: SimLockStore.state.nckSkipButton,
        showAttentionInNck: SimLockStore.state.showAttentionInNck
      });
    });
    this.store = SimLockStore;
    Service.request('registerHierarchy', this);
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
    if (this.element.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    this.setState({
      active: false
    });
  }

  render() {
    let slot = null;
    if (this.state.slots.length && this.state.active) {
      slot = (
        <SimDialog onClose={() => {this.onClose()}}
          ref={(dom)=>{this.dialog=dom}} slot={this.state.slots[0]}
          nckSkipButton={this.state.nckSkipButton}
          showAttentionInNck={this.state.showAttentionInNck}
        />
      );
    }
    return (
      <div id='sim-lock-container' data-z-index-level='dialog-overlay'
        ref={(dom) => {this.element = dom;}}>
        {slot}
      </div>
    );
  }
}
