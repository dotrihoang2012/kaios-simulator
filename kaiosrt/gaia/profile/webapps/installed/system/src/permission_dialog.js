import React from 'react';
import ReactDOM from 'react-dom';

import BaseComponent from 'base-component';
import ReactDialog from 'react-dialog';
import SoftKeyStore from 'soft-key-store';
import * as utils from './util/utils';

import '../scss/permission_dialog.scss';

export default class PermissionDialog extends BaseComponent {
  FOCUS_SELECTOR = '.focusable:not(.hidden)';
  constructor(props) {
    super(props);
    this.state = {
      id: '',
      isApp: false,
      name: '',
      permissions: {},
      moreInfoShown: false,
      configs: new Map()
    }
  }
  softkeys = {
    left: utils.toL10n('deny'),
    center: utils.toL10n('allow'),
    right: utils.toL10n('more')
  };
  componentDidMount() {
    this.element = ReactDOM.findDOMNode(this);
    this.moreInfoBox = ReactDOM.findDOMNode(this.refs.moreInfo);
    this.container = ReactDOM.findDOMNode(this.refs.container);
    this.toggleMoreInfo = ReactDOM.findDOMNode(this.refs.toggleMoreInfo);

    this.refs.dialog.on('closed', () => {
      this.clear();
      Service.request('focus');
    });
    this.refs.dialog.on('opened', () => {
      Service.request('focus');
    });
  }
  componentDidUpdate() {
    this.updateSoftKeys();
  }

  updateSoftKeys() {
    const isSimpleStyle = this.container.classList.contains('simple-style');
    if (isSimpleStyle) {
      let _softkeys  = {
        left: utils.toL10n('deny'),
        right: utils.toL10n('allow')
      };
      SoftKeyStore.register(_softkeys, this.element);
      this.softkeys = _softkeys;
    } else {
      let _softkeys = {
        left: utils.toL10n('deny'),
        center: utils.toL10n('allow'),
        right: utils.toL10n('more')
      };
      if (this.state.moreInfoShown) {
        _softkeys.right = utils.toL10n('less');
      }
      SoftKeyStore.register(_softkeys, this.element);
      this.softkeys = _softkeys;
    }
  }

  clear() {
    this.setState({
      id: '',
      isApp: false,
      name: '',
      permissions: {},
      moreInfoShown: false
    });
    SoftKeyStore.unregister(this.element);
  }

  goNextDialog() {
    const configs = this.state.configs;
    configs.delete(this.state.id);
    const keys = Array.from(configs.keys());
    if (!keys.length) {
      this.refs.dialog.hide();
      this.props.app._setVisibleForScreenReader(true);
    } else {
      this.setState({
        id: keys[0],
        moreInfoShown: false,
        configs: configs
      });
    }
  }

  show(config) {
    this.setState((prevState) => {
      let configs = prevState.configs;
      configs.set(config.requestId, config);
      return {
        id: Array.from(configs.keys())[0],
        moreInfoShown: false,
        configs: configs
      };
    }, () => {
      this.refs.dialog.show();
      this.updateSoftKeys();
      this.props.app._setVisibleForScreenReader(false);
    });
  }

  hide() {
    this.goNextDialog();
  }

  focus() {
    this.container.focus();
  }

  scrollMoreInfoBox(direction) {
    if (this.state.moreInfoShown) {
      let maxOffset = this.moreInfoBox.scrollHeight -
        this.moreInfoBox.clientHeight;
      let scrolloffset ;
      let distance = this.moreInfoBox.clientHeight - 41;
      if (direction > 0) {
        scrolloffset = this.moreInfoBox.scrollTop +  distance;
      } else if (direction < 0){
        scrolloffset = this.moreInfoBox.scrollTop -  distance;
      }

      if (scrolloffset < 0) {
        scrolloffset = 0;
      } else if (scrolloffset > maxOffset) {
        scrolloffset = maxOffset;
      }
      this.moreInfoBox.scrollTo(0, scrolloffset);
    }
  }

  onFocus() {
    this.updateSoftKeys();
  }

  onKeyDown(evt) {
    const config = this.state.configs.get(this.state.id)
    switch (evt.key) {
      case 'ArrowDown':
        evt.preventDefault();
        evt.stopPropagation();
        this.scrollMoreInfoBox(1);
        break;
      case 'ArrowUp':
        evt.preventDefault();
        evt.stopPropagation();
        this.scrollMoreInfoBox(-1);
        break;
      case 'SoftLeft':
        evt.preventDefault();
        evt.stopPropagation();
        config.deny();
        this.hide();
        break;
      case 'SoftRight':
        if (this.softkeys.center) {
          this.setState({
            moreInfoShown: !this.state.moreInfoShown
          });
        } else {
          config.allow();
          this.hide();
        }
        break;
      case 'BrowserBack':
      case 'Backspace':
      case 'EndCall':
        evt.stopPropagation();
        evt.preventDefault();
        config.cancel();
        this.hide();
        break;
    }
  }

  onKeyUp(evt) {
    const config = this.state.configs.get(this.state.id)
    if (evt.key === 'Enter') {
      evt.preventDefault();
      evt.stopPropagation();
      if (this.softkeys.center) {
        config.allow();
        this.hide();
      }
    }
  }

  render() {
    const config = this.state.configs.get(this.state.id) || this.state;
    var permissionType = Object.keys(config.permissions)[0];
    var permissionID = '';
    if (permissionType) {
      if (config.permissions['video-capture'] && config.permissions['audio-capture']) {
        permissionType = 'media-capture';
      }
      permissionID = permissionType.replace(':', '-');
    }

    var isCamSelector = false;
    if (config.permissions['video-capture'] &&
      config.permissions['video-capture'].length > 1) {
      isCamSelector = true;
    }
    let isSimpleStyle = !config.isApp;
    var moreInfoClass = 'hidden';
    if (this.state.moreInfoShown && !isSimpleStyle) {
      moreInfoClass = '';
    }

    if (permissionID && 'geolocation' !== permissionID) {
      isSimpleStyle = true;
    }
    let primaryHidden = permissionType === 'fullscreen' ||
      (this.state.moreInfoShown && !isSimpleStyle);
    return (
      <ReactDialog ref="dialog"
        header={config.isApp ? (isCamSelector ? utils.toL10n('title-cam') : utils.toL10n('title-app')) :
          utils.toL10n('title-web')}
        translated={true}
        noFocus={true}
        noClose={true}
      >
        <div tabIndex="-1"
          className={"container content " + config.name.toLowerCase() + (isSimpleStyle ? ' simple-style' : '')}
          onKeyDown={(e)=>this.onKeyDown(e)}
          onKeyUp={(e)=>this.onKeyUp(e)}
          onFocus={(e)=>this.onFocus(e)}
          ref="container"
        >

          <div className={"permission-more-info " + (primaryHidden ? 'hidden' : '')}>
            <div className='message primary'>{
              utils.toL10n('perm-' + permissionID + (config.isApp ? '-appRequest' : '-webRequest'),
                JSON.parse(config.isApp ? ('{"app":"'+config.name+'"}') : ('{"site":"'+config.origin+'"}')))
              }
            </div>
          </div>

          <div
            className={"permission-more-info-box primary " +  moreInfoClass}
            ref="moreInfo"
          >
            {utils.toL10n('perm-' + permissionID + '-more-info', {}, false)}
          </div>
        </div>
      </ReactDialog>
    );
  }
}
