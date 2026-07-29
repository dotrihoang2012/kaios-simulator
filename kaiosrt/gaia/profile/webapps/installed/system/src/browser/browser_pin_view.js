/* global Service */ 
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable react/prop-types */

import React from 'react';
import BaseComponent from 'base-component';
import BrowserIconStore from '../../browser/js/browser_icon_store.js';
import '../../scss/browser_pin_view.scss';

function Items(props) {
  let useDefaultIcon = '';

  switch (props.icon) {
    case '':
      useDefaultIcon =
        props.fontIcon || props.type === 'normal' ? '' : 'default';
      break;
    case null:
      useDefaultIcon = 'not-found';
      break;
    default:
      break;
  }

  return (
    <div
      tabIndex="-1"
      className="browser-pin-item focusable"
      data-type={props.type}
      data-pin-num={props.pinNum}>
      <div
        className={useDefaultIcon}
        data-icon={props.fontIcon}
        aria-hidden="true">
        <img
          className={props.icon ? '' : 'hidden'}
          src={props.icon} />
      </div>
      <i className="number">{props.num}</i>
    </div>
  )
}

export default class BrowserPinView extends BaseComponent {
  constructor(props) {
    super(props);
    this.state = {
      active: false,
      pinSites: []
    };

    this.name = 'BrowserPinView';
    this.EVENT_PREFIX = 'BrowserPinView';
    this.GRID_ROW_ITEMS = 3;
    this.pinUrl = '';
    this.focusIndex = 0;

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onFocus = this.onFocus.bind(this);

    window.addEventListener('homescreenopened', this);
    window.addEventListener('activityrequesting', this);
  }

  show(url) {
    this.pinUrl = url;
    return this.getSites()
      .then((results) => this.ensureIcon(results))
      .then((results) => {
        this.setState({
          active: true,
          pinSites: results
        });
      })
  }

  hide() {
    this.setState({
      active: false,
      pinSites: []
    });
  }

  setHierarchy(value) {
    if (value) {
      this.gridMenu && this.gridMenu.focus();
    } else {
      this.hide();
    }
  }

  respondToHierarchyEvent(evt) {
    if (evt.type === 'home' && this.state.active) {
      this.hide();
    }
    return true;
  }

  getSites() {
    return new Promise((resolve) => {
      const results = [];
      if (Service.query('VoiceAssistant.isVAEnabled')) {
        const vaIcon =
          Service.query('VoiceAssistant.getVAInAppIcon');

        results.push({
          type: 'fixed',
          id: 'va',
          num: this.GRID_ROW_ITEMS + 1,
          icon: vaIcon || '',
          fontIcon: !vaIcon ? 'mic' : '' 
        });
      }

      const len = results.length;

      if (window.browserPinSitesStore) {
        window.browserPinSitesStore.getPinSites()
          .then((sites) => {
            for(let i = 0; i < sites.length - len; i++) {
              results.push({
                type: sites[i] ? 'normal' : 'empty',
                num: this.GRID_ROW_ITEMS + results.length + 1,
                pinNum: i,
                icon: sites[i] ? sites[i].tile : '',
                data: sites[i]
              });
            }

            resolve(results);
          });
      } else {
        resolve(results);
      }
    });
  }

  ensureIcon(results) {
   return results.map((result, index) => {
      if (result.type === 'normal' && !result.icon && result.data) {
        const icon = BrowserIconStore.getIcon(result.data);

        if (typeof icon === 'string') {
          result.icon = icon;
        } else {
          icon.then((uri) => {
            this.setState((state) => {
              if (state.pinSites) {
                state.pinSites[index].icon = uri;
                return { pinSites: state.pinSites };
              }
            });
          });

          result.icon = '';
        }
      }

      return result;
    });
  }

  onKeyDown(evt) {
    let prevetEvents = true;
    let key = evt.key;

    if ('rtl' === document.dir) {
      key = { ArrowLeft: 'ArrowRight', ArrowRight: 'ArrowLeft' }[key] || key;
    }

    switch (key) {
      case 'Enter':
        this.pin(evt.target)
        break;
      case 'ArrowDown':
      case 'ArrowUp':
        if (this.focusIndex <= this.GRID_ROW_ITEMS - 1) {
          this.focusIndex = this.focusIndex + this.GRID_ROW_ITEMS;
        } else {
          this.focusIndex = this.focusIndex - this.GRID_ROW_ITEMS;
        }

        this.updateFocusItem();
        break;
      case 'ArrowLeft':
        this.focusIndex = (this.focusIndex + this.candidates.length - 1) %
          this.candidates.length;
        this.updateFocusItem();
        break;
      case 'ArrowRight':
        this.focusIndex = (this.focusIndex + 1) % this.candidates.length;
        this.updateFocusItem()
        break;
      case 'SoftLeft':
      case 'BrowserBack':
      case 'Backspace':
        this.hide();
        break;
      default:
        if (key > 3 && key < 10) {
          this.focusIndex = key - this.GRID_ROW_ITEMS - 1;
          this.updateFocusItem();
          this.pin(document.activeElement, true);
        } else {
          prevetEvents = false;
        }

        break;
    }

    if (prevetEvents) {
      evt.preventDefault();
      evt.stopPropagation();
    }
  }

  pin(element, isFake) {
    if (element.dataset.type === 'fixed') {
      if (isFake) {
        Service.request('SystemToaster:show', { textL10n: 'pinSiteLocked' });
      }
    } else {
      window.places.store.getPlace(this.pinUrl)
        .then((data) => {
          if (data) {
            window.browserPinSitesStore
              .replace(element.dataset.pinNum, data)
              .then(() => {
                Service.request(
                  'SystemToaster:show',
                  { textL10n: 'pinSiteCompletely' }
                );

                this.hide();
              });
          }
        });
    }
  }

  onFocus() {
    this.updateFocusItem();
  }

  updateFocusItem() {
    if (!this.candidates) return;
    const focusItem = this.candidates[this.focusIndex];
    focusItem.focus();

    Service.request('SoftKeyStore:register', {
      left: 'cancel',
      center: focusItem.dataset.type === 'fixed' ? '' : 'select',
      right: ''
    }, this.element, 'light');
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

  componentDidUpdate(prevProps, prevState) {
    if (this.state.active !== prevState.active) {
      if (!this.state.active) {
        this.publish('-deactivated');
      } else {
        this.candidates = Array.from(this.element.querySelectorAll('.focusable'));
        this.publish('-activated');
      }
    }
  }

  componentWillUnmount() {
    Service.request('SoftKeyStore:unregister', this.element, false);
    window.removeEventListener('homescreenopened', this);
    window.removeEventListener('activityrequesting', this);
    this.element = null;
  }

  render() {
    const items = this.state.pinSites.map((data) => {
      return <Items key={data.num} {...data} />
    });
    
    return (
      <div
        id="browser-pin-container"
        className={this.state.active ? '' : 'hidden'}
        ref={(dom) => {this.element = dom;}}>
        <div className="content">
          <header>
            <div className="title p-pri" data-l10n-id="pin-to-top-sites"></div>
            <div className="subtitle p-pri" data-l10n-id="select-spot"></div>
          </header>
          <div
            className="grid-wrapper"
            tabIndex="-1"
            onFocus={this.onFocus}
            onKeyDown={this.onKeyDown}
            ref={(dom) => {this.gridMenu = dom;}}>
            {items}
          </div>
        </div>
      </div>
    );
  }
}
