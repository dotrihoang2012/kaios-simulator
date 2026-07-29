import React from 'react';
import ReactDOM from 'react-dom';

import BaseComponent from 'base-component';
import ReactDialog from 'react-dialog';
import SoftKeyStore from 'soft-key-store';
import * as utils from './util/utils';
import '../scss/sim_dialog.scss';

export default class SimDialog extends BaseComponent {
  name = 'SimDialog';
  unlockSimLock = false;
  EVENT_PREFIX = 'simdialog';
  nckSkipButton = false;
  LONG_HOLD_INTERVAL = 3000;
  TYPE_MAP = {
    'pinRequired': 'pin',
    'pukRequired': 'puk',
    'permanentBlocked': 'blocked',
    'networkLocked': 'nck',                //  CARD_LOCK_TYPE_NCK = 4;
    'networkSubsetLocked': 'nsck',         //  CARD_LOCK_TYPE_NSCK = 5;
    'network1Locked': 'nck1',              //  CARD_LOCK_TYPE_NCK1 = 6;
    'network2Locked': 'nck2',              //  CARD_LOCK_TYPE_NCK2 = 7;
    'hrpdNetworkLocked': 'hnck',           //  CARD_LOCK_TYPE_HNCK = 8;
    'corporateLocked': 'cck',              //  CARD_LOCK_TYPE_CCK = 9;
    'serviceProviderLocked': 'spck',       //  CARD_LOCK_TYPE_SPCK = 10;
    'simPersonalizationLocked': 'pck',     //  CARD_LOCK_TYPE_PCK = 11;
    'ruimCorporateLocked': 'rcck',         //  CARD_LOCK_TYPE_RCCK = 12;
    'ruimServiceProviderLocked': 'rspck',  //  CARD_LOCK_TYPE_RSPCK = 13;
    'networkPukRequired': 'nck-puk',
    'networkSubsetPukRequired': 'nsck-puk',
    'network1PukRequired': 'nck1-puk',
    'network2PukRequired': 'nck2-puk',
    'hrpdNetworkPukRequired': 'hnck-puk',
    'corporatePukRequired': 'cck-puk',
    'serviceProviderPukRequired': 'spck-puk',
    'simPersonalizationPukRequired': 'pck-puk',
    'ruimCorporatePukRequired': 'rcck-puk',
    'ruimServiceProviderPukRequired': 'rspck-puk'
  };
  FOCUSABLE_SELECTOR = ':not(.hidden) > .focusable,.navigable:not(.hidden)';

  timeoutHandle = null;
  lastElement = null;

  getLockType(cardstate) {
    return this.TYPE_MAP[cardstate];
  }
  constructor(props) {
    super(props);
    let lockType = this.TYPE_MAP[props.slot.getCardState()];
    this.showAttentionInNck = props.showAttentionInNck;
    this.state = {
      showAttention: (this.showAttentionInNck && lockType === 'nck' ||
        lockType === 'puk' || lockType === 'blocked' ||
        lockType.indexOf('-puk') >= 0),
      lockType: lockType,
      retryCount: -1,
      errorName: '',
      unmatchPin: false,
      slot: this.props.slot  /* SIMSlot instance */
    }
    this.nckSkipButton = props.nckSkipButton;
  }
  componentWillReceiveProps(nextProps) {
    this.nckSkipButton = nextProps.nckSkipButton;
    this.showAttentionInNck = nextProps.showAttentionInNck;
    let lockType = this.TYPE_MAP[nextProps.slot.getCardState()];
    if (nextProps.slot.index !== this.props.slot.index ||
      lockType !== this.state.lockType) {
      this.pinInput.value = '';
      this.pukInput.value = '';
      this.newPinInput.value = '';
      this.confirmPinInput.value = '';
      this.xckInput.value = '';
      this.setState({
        showAttention: (this.showAttentionInNck && lockType === 'nck' ||
          lockType === 'puk' || lockType === 'blocked' ||
          lockType.indexOf('-puk') >= 0),
        errorName: '',
        lockType: lockType
      }, () => {
        this.show(this.props.slot);
        if (this.element.contains(document.activeElement)) {
          this.focusItem();
        }
      });
    }
  }
  componentDidMount() {
    this.show(this.props.slot);
    this.updateSoftKeys();
    this.configInputElements();
  }
  componentDidCatch(error) {
    console.error(error);
  }
  clear() {
    this.pinInput.value = '';
    this.pukInput.value = '';
    this.newPinInput.value = '';
    this.confirmPinInput.value = '';
    this.xckInput.value = '';
    this.setState({
      errorName: '',
      unmatchPin: false,
      retryCount: -1
    });
  }

  configInputElements() {
    // Reactjs only allow limited HTML Attributes and
    // x-inputmode is not one of them.
    // Use standard setAttribute() to set mode to digit for all the inputs
    // since all the sim related password shold be entering digits.
    // If react update to 16, then can remove it.
    let inputs = this.element.getElementsByTagName('input');
    Array.from(inputs).forEach((input) => {
      input.setAttribute('x-inputmode', 'digit');
    });
  }
  show(slot) {
    let lockType = this.state.lockType;
    let isXckPuk = false;
    if (lockType.indexOf('-puk') >= 0) {
      lockType = lockType.replace('-puk', '');
      isXckPuk = true;
    }
    if (lockType !== 'blocked' && !isXckPuk) {
      this.setState({
        retryCount: -1
      });
    }
  }

  focus() {
    this.focusItem() || this.container.focus();
  }

  onFocus() {
    if (document.activeElement === this.container) {
      this.focusItem();
    } else if (document.activeElement.tagName === 'INPUT') {
      let current = this.element.querySelector('.focus');
      current && current.classList.remove('focus');
      document.activeElement.parentNode.classList.add('focus');
    } else {
      let current = this.element.querySelector('.focus');
      current && current.classList.remove('focus');
    }
    this.updateSoftKeys();
  }

  clearInput() {
    this.pinInput.value = '';
    this.pukInput.value = '';
    this.newPinInput.value = '';
    this.confirmPinInput.value = '';
    this.xckInput.value = '';
    this.setState({
      unmatchPin: false
    });
  }

  focusItem() {
    let candidates =
      Array.from(this.element.querySelectorAll(this.FOCUSABLE_SELECTOR));
    if (!candidates.length) {
      return false;
    }
    candidates[0].focus();
    return true;
  }

  findNext() {
    let candidates =
      Array.from(this.element.querySelectorAll(this.FOCUSABLE_SELECTOR));
    if (!candidates.length) {
      return this.element;
    }

    let current = document.activeElement;
    let next = current;
    candidates.some(function(candidate, index) {
      if (candidate === current) {
        next = candidates[(index + 1) % candidates.length];
        return true;
      } else {
        return false;
      }
    });
    return next;
  }

  findPrev() {
    let candidates =
      Array.from(this.element.querySelectorAll(this.FOCUSABLE_SELECTOR));
    if (!candidates.length) {
      return this.element;
    }

    let current = document.activeElement;
    let next = current;
    candidates.some(function(candidate, index) {
      if (candidate === current) {
        next = candidates[(index - 1 + candidates.length) % candidates.length];
        return true;
      } else {
        return false;
      }
    });
    return next;
  }

  launchEmergencyCall() {
    const manifestUrl = window.AppOrigin.getManifestURL('emergency-call');
    const url =
      `${window.AppOrigin.getOrigin('emergency-call')}/index.html#secure`;
    window.dispatchEvent(new window.CustomEvent('secure-launchapp',
      {
        'detail': {
          'appURL': url,
          'appManifestUrl': manifestUrl
        }
      }
    ));
    this.clearInput();
  }

  onInputFocus() {
    document.activeElement.classList.add('hide-cursor');
    window.setTimeout(() => {
      let input = document.activeElement;
      if ('INPUT' === input.tagName) {
        input.setSelectionRange(input.value.length, input.value.length);
        input.classList.remove('hide-cursor');
        let current = this.element.querySelector('.focus');
        current && current.classList.remove('focus');
        input.parentNode.classList.add('focus');
      }
    });
  }

  onKeyUp(evt) {
    if ((evt.key === 'Backspace' || evt.key === 'EndCall') &&
      this.timeoutHandle) {
      window.clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  onKeyDown(evt) {
    let nextFocus = null;
    switch (evt.key) {
      case 'SoftRight':
        this.unlock();
        break;
      case 'SoftLeft':
        evt.preventDefault();
        evt.stopPropagation();
        this.launchEmergencyCall();
        break;
      case 'ArrowDown':
        evt.preventDefault();
        evt.stopPropagation();
        nextFocus = this.findNext();
        break;
      case 'ArrowUp':
        evt.preventDefault();
        evt.stopPropagation();
        nextFocus = this.findPrev();
        break;
      case 'Enter':
        if (this.nckSkipButton && this.state.lockType === 'nck' ||
          'blocked' === this.state.lockType) {
          // notify simdialogmanager to close us.
          // because there's no cardstatechange if current
          // state is blocked.
          Service.request('setNckSkipped', this.props.slot.index);
          this.props.onClose && this.props.onClose();
        }
        break;
      case 'Backspace':
      case 'EndCall':
        window.clearTimeout(this.timeoutHandle);
        this.timeoutHandle = window.setTimeout(() => {
          navigator.vibrate(50);
          Service.request('showSleepMenu');
          this.timeoutHandle = null;
        }, this.LONG_HOLD_INTERVAL);

        if ('INPUT' === document.activeElement.tagName &&
            !document.activeElement.value ||
            this.state.showAttention) {
          evt.preventDefault();
          evt.stopPropagation();
        }
        break;
    }
    if (nextFocus) {
      nextFocus.focus();
    }
    if (nextFocus === this.pukInput) {
      this.pukInput.parentNode.scrollIntoView(false);
    }
    if (nextFocus === this.confirmPinInput || nextFocus === this.newPinInput) {
      this.confirmPinInput.parentNode.scrollIntoView({ block: 'end' });
    }
  }

  unlock() {
    if ('blocked' === this.state.lockType ||
      this.showAttentionInNck && this.state.lockType === 'nck') {
      return Promise.reject('blocked');
    }

    if (this.state.showAttention) {
      if ('puk' === this.state.lockType) {
        this.setState({
          retryCount: -1,
          showAttention: false,
          errorName: ''
        });
      }
      return Promise.reject('attention');
    }

    if (!this.isSubmittable()) {
      return;
    }
    let config = {
      lockType: this.state.lockType
    };
    switch (this.state.lockType) {
      case 'pin':
        let pin = this.pinInput.value;
        if (!pin) {
          return Promise.reject('novalue');
        }
        config.pin = pin;
        break;
      case 'puk':
        let puk = this.pukInput.value;
        let newPin = this.newPinInput.value;
        let confirmPin = this.confirmPinInput.value;
        if (newPin !== confirmPin || newPin === '' || confirmPin === '') {
          return Promise.reject('novalue');
        }
        config.puk = puk;
        config.newPin = newPin;
        break;
        // network locks
      default:
        let xck = this.xckInput.value;
        if (!xck) {
          return Promise.reject('novalue');
        }
        config.pin = xck;
        break;
    }
    if (this.unlockSimLock) {
      return Promise.reject('repeat unlock');
    }
    this.unlockSimLock = true;
    return this.props.slot.unlockCardLock(config).then((e) => {
      this.unlockSimLock = false;
      if (e) {
        this.clear();
        this.handleError(config.lockType, e);
      }
      // SimLockStore will get cardstatechange if locked successfully
    }, (e) => {
      this.unlockSimLock = false;
    });

  }

  handleError(lockType, e) {
    let retry = (e.retryCount) ? e.retryCount : -1;
    if (e.retryCount === 0 && lockType === 'puk') {
      this.setState({
        lockType: 'blocked',
        showAttention: true,
        errorName: ''
      }, () => {
        if (this.element.contains(document.activeElement)) {
          this.focusItem();
        }
      });
    } else {
      this.setState({
        retryCount: retry,
        errorName: 'error'
      });
    }
  }

  componentDidUpdate() {
    if (document.activeElement === this.element ||
      document.activeElement === this.container) {
      this.focusItem();
    } else if (!this.element.contains(document.activeElement)) {
      Service.request('focus');
    }

    if (document.activeElement === this.confirmPinInput ||
      document.activeElement === this.newPinInput) {
      this.confirmPinInput.parentNode.scrollIntoView({ block: 'end' });
    }
    this.updateSoftKeys();
  }

  updateSoftKeys() {
    if (this.lastElement && this.lastElement !== this.container) {
      SoftKeyStore.unregister(this.lastElement);
    }
    this.lastElement = this.container;
    if (!this.container) {
      return;
    }
    if (this.nckSkipButton && this.state.lockType === 'nck') {
      if (this.isSubmittable()) {
        SoftKeyStore.register({
            left: utils.toL10n('emergency-call'),
            center: utils.toL10n('skip'),
            right: utils.toL10n('verify-rsk') },
          this.container);
      } else {
        SoftKeyStore.register({
          left: utils.toL10n('emergency-call'),
          center: utils.toL10n('skip')
        }, this.container);
      }
    } else {
      if (this.state.showAttention &&
        'puk' === this.state.lockType) {
        SoftKeyStore.register({
          left: utils.toL10n('emergency-call'),
          right: utils.toL10n('enter-puk-rsk')
        }, this.container);
      } else if (this.isSubmittable()) {
        SoftKeyStore.register({
          left: utils.toL10n('emergency-call'),
          right: utils.toL10n('verify-rsk')
        }, this.container);
      } else {
        SoftKeyStore.register({
          left: utils.toL10n('emergency-call')
        }, this.container);
      }
    }
  }

  componentWillUnmount() {
    SoftKeyStore.unregister(this.container);
  }

  isSubmittable() {
    if (!this.element) {
      return false;
    }
    switch (this.state.lockType) {
      case 'pin':
        return this.pinInput.value.length >= 4 &&
          this.pinInput.value.length <= 8;
      case 'puk':
        return (
          this.pukInput.value.length >= 4 &&
          this.pukInput.value.length <= 8 &&
          this.newPinInput.value.length >= 4 &&
          this.newPinInput.value.length <= 8 &&
          this.confirmPinInput.value.length >= 4 &&
          this.confirmPinInput.value === this.newPinInput.value
        );
      case 'pck':
        return this.xckInput.value.length >= 6;
      default:
        return this.xckInput.value.length >= 8;
    }
  }

  onInput(evt) {
    this.filterInvalidInput();
    this.updateSoftKeys();
    if (this.state.lockType === 'puk' &&
        this.newPinInput.value.length >= 4 &&
        this.confirmPinInput.value.length) {
      if (this.confirmPinInput.value !==
          this.newPinInput.value) {
        this.setState({
          unmatchPin: true
        });
      } else {
        this.setState({
          unmatchPin: false
        });
      }
    }
  }

  filterInvalidInput() {
    switch (this.state.lockType) {
      case 'pin':
        this.pinInput.value = this.pinInput.value.replace(/[^\d]/g,'');
        break;
      case 'puk':
        this.pukInput.value = this.pukInput.value.replace(/[^\d]/g,'');
        this.newPinInput.value = this.newPinInput.value.replace(/[^\d]/g,'');
        this.confirmPinInput.value =
          this.confirmPinInput.value.replace(/[^\d]/g,'');
        break;
      default:
        this.xckInput.value = this.xckInput.value.replace(/[^\d]/g,'');
        break;
    }
  }

  render() {
    let _ = window.api.l10n.get;
    let type = this.state.lockType;
    if (type !== 'pin' && type !== 'puk' && type !== 'blocked') {
      type = 'nck';
    }
    let triesLeft = '';
    if (!this.state.showAttention && this.state.retryCount !== -1) {
      let retryDOM = (
        <span className={(this.state.retryCount >= 0 ? '' : 'hidden')}>
          {_('inputCodeRetriesLeft', {'n': this.state.retryCount})}
        </span>
      );
      triesLeft =
        <span className='error secondary'>
          <span className='content'>
            <span className={(this.state.errorName) ? '' : 'hidden'}>
              {_(type + 'ErrorMsg') + ' '}
            </span>
            {retryDOM}
          </span>
        </span>
    }
    let attention = '';
    if (this.state.showAttention) {
      let head_id = 'sim-attention-head';
      if (this.state.lockType === 'blocked') {
        head_id = 'cardPermanentlyLockMsg-head';
      }
      let attentionBody = _('sim-attention-body');
      if (this.state.lockType === 'blocked') {
        attentionBody = _('cardPermanentlyLockMsg-body');
      } else if (this.state.lockType !== 'puk') {
        if (SIMSlotManager.isMultiSIM()) {
          attentionBody = _('multiSIMxcklockContent', {
            'type': this.state.lockType.toUpperCase(),
            'n': this.props.slot.index + 1
          });
        } else {
          attentionBody = _('xcklockContent', {
            'type': this.state.lockType.toUpperCase()
          });
        }
      }
      attention = <div className='primary content-container focusable'
                    tabIndex='-1' role='menuitem'>
                    <div
                      className={(this.state.lockType !== 'blocked' &&
                        this.state.lockType !== 'puk' ? 'hidden' : '')}>
                      {utils.toL10n(head_id)}
                    </div>
                    <div>{attentionBody}</div>
                  </div>
    }
    let showPin = 'pin' === this.state.lockType;
    let showPuk = !this.state.showAttention && this.state.lockType === 'puk';
    let showXck = !this.state.showAttention && this.state.lockType !== 'pin' &&
      this.state.lockType !== 'puk';
    let header;
    if (SIMSlotManager.isMultiSIM() && this.props.slot) {
      if (this.state.showAttention) {
        header = _('multiSIM-attention-header', {
          'n': this.props.slot.index + 1
        });
      } else {
        header = _('multiSIMxckTitle', {
          'n': this.props.slot.index + 1,
          'type': this.state.lockType.toUpperCase()
        });
      }
    } else {
      if (this.state.showAttention) {
        header = _('sim-attention-header');
      } else {
        if (this.state.lockType.toUpperCase() === 'PUK') {
          header = _('pukTitle');
        } else {
          header = _('xckTitle', {
            'type': this.state.lockType.toUpperCase()
          });
        }
      }
    }
    let errorClassName =
      'error secondary ' + (this.state.unmatchPin ? '' : 'hidden');
    // For some reason, data-l10n-id does not trigger l10n library to translate.
    // So we need to use the direct translation here.
    return (
      <div ref={(dom)=>{this.element=dom}}>
        <ReactDialog
        ref={(dom)=>{this.dialog = dom}}
        header={header}
        translated={true}
        noClose={true}
        noFocus={true}
        ok=' '
        cancel='emergency-call'
        onFocus={()=>{this.container.focus()}}>
        <div tabIndex='-1'
             className='container sim-dialog'
             onKeyDown={(e)=>this.onKeyDown(e)}
             onKeyUp={(e)=>this.onKeyUp(e)}
             onFocus={(e)=>this.onFocus(e)}
             onInput={(e)=>this.onInput(e)}
             ref={(dom) => { this.container = dom; }}>
         {attention}
         <div key='pin' id='pinArea'
           className={'input-wrapper ' + (showPin ? '' : 'hidden')}
           role='listitem'>
           <div className='secondary label'>{_('simPin')}
           </div>
           <input className='primary focusable'
             onFocus={(e)=>this.onInputFocus(e)}
             ref={(dom)=>{this.pinInput=dom}}
             name='simpin' type='password'
             size='8' maxLength='8' x-inputmode='digit' />
           <span>{triesLeft}</span>
         </div>
         <div key='puk' id='pukArea'
           className={'input-wrapper ' + (showPuk ? '' : 'hidden')}
           role='listitem'>
           <div className='secondary label'>{_('pukCode')}
           </div>
           <input className='primary focusable'
             onFocus={(e)=>this.onInputFocus(e)}
             ref={(dom)=>{this.pukInput=dom}} name='simpuk' type='password'
             size='8' maxLength='8' x-inputmode='digit' />
           <span>{triesLeft}</span>
         </div>
         <div key='xck'  id='xckArea'
            className={'input-wrapper ' + (showXck ? '' : 'hidden')}
            role='listitem'>
            <div name='xckDesc'
              className='secondary label'>
            {_('xckCode', {'type': this.state.lockType.toUpperCase()})}
         </div>
           <input
            className='primary focusable'
            onFocus={(e)=>this.onInputFocus(e)}
            ref={(dom)=>{this.xckInput=dom}}
            name='xckpin'
            type='password'
            size='16'
            maxLength='16'
            x-inputmode='digit'
          />
          <span>{triesLeft}</span>
         </div>
         <div key='newPin' id='newPinArea'
           className={'input-wrapper ' + (showPuk ? '' : 'hidden')}
           role='listitem'>
           <div className='secondary label'>{_('newSimPinMsg')}</div>
           <input
            className='primary focusable'
            onFocus={(e)=>this.onInputFocus(e)}
            ref={(dom)=>{this.newPinInput=dom}}
            name='newSimpin'
            type='password'
            size='8'
            maxLength='8'
            x-inputmode='digit'
          />
         </div>
         <div key='confirmPin' id='confirmPinArea'
           className={'input-wrapper ' + (showPuk ? '' : 'hidden')}
           role='listitem'>
           <div className='secondary label'>
             {_('confirmNewSimPinMsg')}
           </div>
           <input
             className='primary focusable'
             onFocus={(e)=>this.onInputFocus(e)}
             ref={(dom)=>{this.confirmPinInput=dom}}
             name='confirmNewSimpin'
             type='password'
             size='8'
             maxLength='8'
             x-inputmode='digit'
           />
           <span className={errorClassName}
             ref='matchError'> <span>{utils.toL10n('newPinErrorMsg')}</span>
           </span>
         </div>
        </div>
       </ReactDialog>
      </div>
    );
  }
}
