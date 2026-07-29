'use strict';
import React from 'react';
import ReactDOM from 'react-dom';

import BaseComponent from 'base-component';
import ReactDialog from 'react-dialog';
import SoftKeyStore from 'soft-key-store';
import '../scss/stk_dialog.scss';

export default class StkDialog extends BaseComponent {
  name = 'StkDialog';

  EVENT_PREFIX = 'stk-dialog-';

  /**
   * This is to record if the user has responsed to the STK by yes or no.
   * @type {Boolean}
   */
  responsed = false;
  constructor(props) {
    super(props);
    this.state = {
    	type: 'confirm',
    	message: '',
    	stkMessage: '',
    	timeout: '',
    	callback: null,
      key: 0,
      options: null,
      isDigitPasswordMode: false,
      onOk: null,
      onCancel: null,
      onBack: null,
      messageType: null,
      header: null
    };
  }

  componentDidMount() {
    this.element = ReactDOM.findDOMNode(this);
    this.container = ReactDOM.findDOMNode(this.refs.container);
    this.refs.dialog.hide();
    /**
     * Need to let HierarchyManager know we are closed/opened.
     */
    this.refs.dialog.on('closed', () => {
      this.clear();
      this.publish('-deactivated');
    });
    this.refs.dialog.on('opened', () => {
      this.publish('-activated');
    });
    Service.register('show', this);
    Service.register('hide', this);
    Service.request('registerHierarchy', this);

    this.rightSK = document.getElementById('software-keys-right');
  }

  configInputElements() {
    // Reactjs only allow limited HTML Attributes and
    // x-inputmode is not one of them.
    // Use standard setAttribute() to set mode to digit for all the inputs
    // since all the sim related password shold be entering digits.
    if (this.state.isDigitPasswordMode) {
      this.refs.iccInputBox.setAttribute('x-inputmode', 'digit');
    }
  }

  clear() {
  	window.clearTimeout(this.timer);
    this.setState({
    	type: 'confirm',
    	message: '',
    	stkMessage: '',
    	timeout: '',
    	callback: null,
      key: 0,
      options: null,
      isDigitPasswordMode: false,
      icons: null,
      onOk: null,
      onCancel: null,
      onBack: null,
      messageType: null,
      header: null
    });
    if (this.refs.iccInputBox) {
      this.refs.iccInputBox.value = '';
    }
  }

  show(config) {
    if (config) {
      config.key = Date.now();
      let options = config.options;
      if (options && !options.isYesNoRequested &&
        options.hideInput && !options.isAlphabet) {
        config.isDigitPasswordMode = true;
      }
      this.setState(config);
    }
    this.refs.dialog.show();
    if (this.state.mode !== 'input' && this.refs.iccMsg) {
      this.refs.iccMsg.scrollTo(0, 0);
    }
    Service.request('focus');
  }

  hide() {
    if (this.refs.dialog.isHidden()) {
      return;
    }
    this.refs.dialog.hide();
  }

  setHierarchy(value) {
    if (value) {
      this.focus();
    } else {

    }
  }

  respondToHierarchyEvent(evt) {
    if (this['_handle_' + evt.type]) {
      return this['_handle_' + evt.type](evt);
    } else {
      return true;
    }
  }

  _handle_home() {
    if (this.refs.dialog.isActive()) {
      this.state.callback && this.state.callback(null);
      this.hide();
      return false;
    } else {
      return true;
    }
  }

  focus() {
    if (this.state.mode === 'input' && this.refs.iccInputBox.type !== 'hidden') {
      this.refs.iccInputBox.focus();
    } else {
      this.refs.iccMsg.focus();
    }
  }

  focusItem() {

  }

  componentDidUpdate() {
    if (document.activeElement === this.element || document.activeElement === ReactDOM.findDOMNode(this.refs.container)) {
      this.focusItem();
    } else if (!this.element.contains(document.activeElement)) {
      this.configInputElements();
      Service.request('focus');
    }
    this.drawMessageIcons();
    this.setTimerIfNecessary();
  }

  setTimerIfNecessary() {
  	if (this.state.timeout) {
  		this.timer = setTimeout(() => {
  			this.state.callback && this.state.callback(false);
  			this.hide();
  		}, this.state.timeout);
  	}
  }

  drawMessageIcons() {
  	if (!this.state.icons && this.element.querySelector('.icons')) {
  		this.element.querySelector('.icons').innerHTML = '';
  		return;
  	}
  	var icons = this.state.icons;
  	if (!icons) {
  		return;
  	}
    for (var i = 0; i < icons.length; i++) {
      this.element.querySelector('.icons').appendChild(STKHelper.getIconCanvas(icons[i]));
    }
  }

  onBack() {
    this.refs.dialog.hide();

    if ('ussd' === this.state.messageType) {
      return this.state.onBack && this.state.onBack();
    }

    this.state.callback && this.state.callback(null);
    Service.request('Icc:backResponse', this.state.stkMessage);
  }

  checkInputValid(value) {
    var options = this.state.options;
    var valid = true;
    if (options) {
      if (options.minLength) {
        valid = valid && (options.minLength <= value.length);
      }
      if (options.maxLength) {
        valid = valid && (value.length <= options.maxLength);
      }
    }
    return valid;
  }

  onOk(value) {
    if ('ussd' === this.state.messageType) {
      if ('input' === this.state.mode) {
        let value = this.refs.iccInputBox.value;
        this.state.onOk && this.state.onOk(value);
      }
      this.hide();
      return;
    }

    let selectedButton;
    if (this.state.options && this.state.options.isHelpAvailable && value) {
      selectedButton = value.selectedButton;
    }
    if (selectedButton === 1) {
      Service.request('helpResponse', this.state.stkMessage);
      return;
    } else if (selectedButton === 0) {
      this.onCancel();
      return;
    }

    switch (this.state.mode) {
  		case 'alert':
        if (this.state.messageType !== 'ussd') {
          let typeOfCommand = this.state.stkMessage.command.typeOfCommand;
          // no need to send TR:
          // STK_CMD_SEND_DTMF(20) / STK_CMD_SEND_SMS(19)
          if (typeOfCommand !== 20 && typeOfCommand !== 19) {
            Service.request('terminateResponse', this.state.stkMessage);
          }
        }
        this.refs.dialog.hide();
  			break;
      case 'aconfirm':
  		case 'confirm':
  		  this.state.callback && this.state.callback(true);
        this.refs.dialog.hide();
  			break;
      case 'input':
        var options = this.state.options;
        if (options && options.isYesNoRequested) {
          this.refs.dialog.hide();
          this.state.callback && this.state.callback(true, true);
        } else {
          var value = this.refs.iccInputBox.value;
          if (this.checkInputValid(value)) {
            this.refs.dialog.hide();
            this.state.callback && this.state.callback(true, value);
          } else {
            // stay dialog
          }
        }
        break;
  	}
  }

  onCancel() {
    if ('ussd' === this.state.messageType) {
      this.refs.dialog.hide();
      return this.state.onCancel && this.state.onCancel();
    }

    var options = this.state.options;
    if (options && options.isYesNoRequested) {
      this.state.callback && this.state.callback(true, false);
    } else {
      this.state.callback && this.state.callback(null);
      Service.request('terminateResponse', this.state.stkMessage);
    }
    this.refs.dialog.hide();
  }

  onHandleChange(e) {
    if (this.state.mode === 'input' &&
      this.refs.iccInputBox && this.refs.iccInputBox.type === 'tel') {
      this.refs.iccInputBox.value =
        this.refs.iccInputBox.value.replace(/[()-]/g, '');
    } else if (this.state.isDigitPasswordMode) {
      this.refs.iccInputBox.value =
        this.refs.iccInputBox.value.replace(/[^0-9*#]/g, '');
    }
  }

  onBlur() {
    if (!this.refs.dialog.isHidden()) {
      this.onCancel();
    }
  }

  getSoftKey() {
    var options = this.state.options;
    var softKeyParams = {};
    if (options && options.isYesNoRequested) {
      softKeyParams = { left: 'no', center: '', right: 'yes' };
    } else {
      switch (this.state.mode) {
        case 'input':
        case 'confirm':
          softKeyParams = this.state.messageType === 'ussd' ?
            { left: 'cancel', right: 'send' } : { left: 'close', right: 'ok' };
          break;
        case 'aconfirm':
          softKeyParams = { left: 'no', right: 'yes' };
          break;
        case 'alert':
          softKeyParams = { left: ' ', center: '', right: 'ok' };
          break;
        default:
          softKeyParams = { left: '', center: '', right: '' };
      }
    }
    if (options && options.isHelpAvailable) {
      softKeyParams.center = 'help';
    }

    if (options && options.minLength) {
      this.rightSK.style.display = 'none';
    }
    return softKeyParams;
  }

  scrollContent(direction) {
    if (!this.refs.iccMsg) {
      return;
    }
    var iccMsg = this.refs.iccMsg;
    var maxOffset = iccMsg.scrollHeight - iccMsg.clientHeight;
    if((iccMsg.scrollTop == 0 && direction < 0)
      ||(iccMsg.scrollTop == maxOffset && direction > 0)){
      return false;
    } else {
      var scorlloffset ;
      var distance = iccMsg.clientHeight - 41;
      if (direction > 0) {
        scorlloffset= iccMsg.scrollTop +  distance;
      } else if (direction < 0){
        scorlloffset=iccMsg.scrollTop -  distance;
      }

      if (scorlloffset < 0) {
        scorlloffset = 0;
      } else if (scorlloffset > maxOffset){
        scorlloffset = maxOffset;
      }
      iccMsg.scrollTo(0, scorlloffset);
      return true;
    }
  }

  onKeyDown(evt) {
    switch (evt.key) {
      case 'ArrowDown':
        evt.stopPropagation();
        evt.preventDefault();
        this.scrollContent(1);
        break;
      case 'ArrowUp':
        evt.stopPropagation();
        evt.preventDefault();
        this.scrollContent(-1);
        break;
    }
  }

  onInput() {
    if (this.state.options && this.state.options.minLength) {
      const value = this.refs.iccInputBox.value;
      if (value.length >= this.state.options.minLength) {
        this.rightSK.style.display = 'unset';
      } else {
        this.rightSK.style.display = 'none';
      }
    }
  }

  render() {
    var _ = window.api.l10n.get;
    var inputType;

    if (this.state.mode === 'input') {
      var options = this.state.options;
      if (options) {
      	if (!options.isYesNoRequested) {
  	     	inputType = this.state.options.isAlphabet ? 'text' : 'tel';
  	      if (options.hideInput) {
  	        inputType = 'password';
  	      }
  	      if (options.hidden) {
  	        inputType = 'hidden';
  	      }
  	    } else {
  	      inputType = 'hidden';
  	    }
      }
    }
   	var softkey = this.getSoftKey();

    var self = this;
    var section = '';
    switch (this.state.mode) {
    	case 'alert':
        section = <section role="region" className="skin-organic" id="icc-alert"
                           data-icons={!!this.state.icons}>
			          <span id="icc-alert-icons" className="icons" ></span>
			          <p id="icc-alert-msg" tabIndex="-1" ref="iccMsg" onBlur={()=>this.onBlur()} onKeyDown={(e) => this.onKeyDown(e)}>{this.state.message}</p>
			        </section>
    		break;
    	case 'confirm':
        section = <section role="region" className="skin-organic" id="icc-confirm"
                           data-icons={!!this.state.icons}>
			          <span id="icc-confirm-icons" className="icons"></span>
			          <p id="icc-confirm-msg" tabIndex="-1" ref="iccMsg" onBlur={()=>this.onBlur()} onKeyDown={(e) => this.onKeyDown(e)}>{this.state.message}</p>
			        </section>
    		break;
    	case 'aconfirm':
        section = <section role="region" className="skin-organic" id="icc-asyncconfirm"
                           data-icons={!!this.state.icons}>
					          <span id="icc-asyncconfirm-icons" className="icons"></span>
					          <p id="icc-asyncconfirm-msg" tabIndex="-1" ref="iccMsg" onBlur={()=>this.onBlur()} onKeyDown={(e) => this.onKeyDown(e)}>{this.state.message}</p>
					        </section>
    		break;
    	case 'input':
          section = <section role="region" className={"skin-organic " + this.state.options.isYesNoRequested ? 'yesnomode' : ''}
                             id="icc-input" data-icons={!!this.state.icons}>
            <div className="form">
              <span id="icc-input-icons" className="icons"></span>
              <p id="icc-input-msg" tabIndex="-1" ref="iccMsg">{this.state.message}</p>
              <input id="icc-input-box"
                maxLength={this.state.options && this.state.options.maxLength ? this.state.options.maxLength : null}
                defaultValue={this.state.options && this.state.options.defaultText ?
                  this.state.options.defaultText.substr(0, this.state.options.maxLength) :
                  ""}
                required=""
                ref="iccInputBox"
                key={this.state.key}
                placeholder={'ussd' === this.state.messageType ? '' : this.state.message}
                type={inputType}
                dir="auto"
                onKeyDown={(e)=>this.onKeyDown(e)}
                onChange={(e)=>this.onHandleChange(e)}
                onInput={() => this.onInput()}
                onBlur={()=>this.onBlur()} />
            </div>
	  </section>
        break;
    }

    let type = this.state.mode === 'alert' ? 'alert' : 'confirm';
    let buttons = [];
    if (this.state.options && this.state.options.isHelpAvailable) {
      type = 'custom';
      buttons[0] =  { 'message': softkey.left };
      buttons[1] =  { 'message': softkey.center };
      buttons[2] =  { 'message': softkey.right };
    }
    return <ReactDialog ref="dialog"
            header={'ussd' === this.state.messageType ? this.state.header : 'icc-message-maintitle'}
            translated={'ussd' === this.state.messageType}
            type={type}
            buttons={buttons}
            noFocus={true}
            ok={softkey.right}
            cancel={softkey.left}
            onFocus={()=>{this.focus()}}
            noClose={true}
            onOk={(value)=>this.onOk(value)}
            onBack={()=>this.onBack()}
            onCancel={()=>this.onCancel()}>
            <div tabIndex="-1"
                 className="container stk-dialog"
                 ref="container">
			     		{section}
            </div>
           </ReactDialog>
  }
}
