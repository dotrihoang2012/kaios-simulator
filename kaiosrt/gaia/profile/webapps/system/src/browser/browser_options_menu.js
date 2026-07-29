/* eslint-disable jsx-a11y/no-static-element-interactions */
import React from 'react';
import BaseComponent from 'base-component';
import '../../scss/browser_options_menu.scss';

export default class BrowserOptionsMenu extends BaseComponent {
  name = 'BrowserOptionsMenu';
  FOCUS_SELECTOR = '.menu-item';
  GRID_ITEM_SUMS = 8;
  GRID_ROW_ITEMS = 4;
  constructor(props) {
    super(props);
    this.focusIndex = 0;
    this.lastGridFocusItem = 0;
  }

  componentDidMount() {
    this.candidates = this.element.querySelectorAll('.menu-item');
    let rsk = '';
    if (Service.query('VoiceAssistant.isVAEnabled')) {
      if (Service.query('getVAInAppIcon')) {
        rsk = 'style=' + JSON.stringify({
          background: 'url(' +
            Service.query('getVAInAppIcon') +
            ') right center / 2.2rem 2.2rem no-repeat'
        });
      } else {
        rsk = 'icon=mic';
      }
    }
    Service.request('SoftKeyStore:register', {
      left: null,
      center: 'select',
      right: rsk
    }, this.element, 'light');
  }

  componentWillUnmount() {
    Service.request('SoftKeyStore:unregister', this.element, false);
    this.element = null;
  }

  updateFocusItem(focusIndex) {
    this.focusIndex = focusIndex;
    const focusItem = this.candidates[focusIndex];
    focusItem.focus();
    if (focusIndex < this.GRID_ITEM_SUMS) {
      this.element.querySelector('.grid-container').scrollIntoView(false);
      this.header.setAttribute('data-l10n-id',
        focusItem.getAttribute('data-subtitle'));
      this.lastGridFocusItem = focusIndex;
    } else {
      this.header.textContent = '';
      this.header.setAttribute('data-l10n-id', 'options');
      focusItem.scrollIntoView(false);
    }
    let csk = 'select';
    if (this.props.options[this.focusIndex].disable) {
      csk = '';
    }
    let rsk = '';
    if (this.focusIndex === 0 && Service.query('VoiceAssistant.isVAEnabled')) {
      if (Service.query('getVAInAppIcon')) {
        rsk = 'style=' + JSON.stringify({
          background: 'url(' +
            Service.query('getVAInAppIcon') +
            ') right center / 2.2rem 2.2rem no-repeat'
        });
      } else {
        rsk = 'icon=mic';
      }
    }
    Service.request('SoftKeyStore:register', {
      left: null,
      center: csk,
      right: rsk
    }, this.element, 'light');
  }

  onFocus() {
    if (document.activeElement === this.element) {
      this.updateFocusItem(this.focusIndex);
    }
  }

  onKeyDown(evt) {
    const key = evt.key;
    let nextFocusIndex = undefined;
    if ((document.dir === 'ltr' && key === 'ArrowLeft') ||
      (document.dir === 'rtl' && key === 'ArrowRight')) {
      if (this.focusIndex < this.GRID_ITEM_SUMS &&
        this.focusIndex !== 0 && this.focusIndex !== this.GRID_ROW_ITEMS) {
        nextFocusIndex = this.focusIndex - 1;
        this.updateFocusItem(nextFocusIndex);
      }
      evt.stopPropagation();
      evt.preventDefault();
    } else if ((document.dir === 'ltr' && key === 'ArrowRight') ||
      (document.dir === 'rtl' && key === 'ArrowLeft')) {
      if (this.focusIndex < this.GRID_ITEM_SUMS &&
        this.focusIndex !== this.GRID_ROW_ITEMS - 1 &&
        this.focusIndex !== this.GRID_ITEM_SUMS - 1) {
        nextFocusIndex = this.focusIndex + 1;
        this.updateFocusItem(nextFocusIndex);
      }
      evt.stopPropagation();
      evt.preventDefault();
    }

    let option = null;

    switch (key) {
      case 'Enter':
        option = this.props.options[this.focusIndex];
        evt.stopPropagation();
        evt.preventDefault();
        if (option && !option.disable) {
          option && option.callback && option.callback();
          Service.request('BrowserMenuManager:hide');
        }
        break;
      case 'SoftRight':
        option = this.props.options[this.focusIndex];
        evt.stopPropagation();
        evt.preventDefault();
        if (option && !option.disable) {
          option && option.subcallback && option.subcallback() &&
          Service.request('BrowserMenuManager:hide');
        }
        break;
      case 'ArrowUp':
        if (this.focusIndex < this.GRID_ROW_ITEMS) {
          nextFocusIndex = this.candidates.length - 1;
        } else if (this.focusIndex < this.GRID_ITEM_SUMS) {
          nextFocusIndex = this.focusIndex - this.GRID_ROW_ITEMS;
        } else if (this.focusIndex === this.GRID_ITEM_SUMS) {
          nextFocusIndex = this.GRID_ROW_ITEMS +
            (this.lastGridFocusItem % this.GRID_ROW_ITEMS);
        } else {
          nextFocusIndex = this.focusIndex - 1;
        }
        if (undefined !== nextFocusIndex) {
          this.updateFocusItem(nextFocusIndex);
        }
        evt.stopPropagation();
        evt.preventDefault();
        break;
      case 'ArrowDown':
        if (this.focusIndex < this.GRID_ROW_ITEMS) {
          nextFocusIndex = this.focusIndex + this.GRID_ROW_ITEMS;
        } else if (this.focusIndex < this.GRID_ITEM_SUMS) {
          nextFocusIndex = this.GRID_ITEM_SUMS;
        } else if (this.focusIndex === this.candidates.length - 1) {
          nextFocusIndex = this.lastGridFocusItem % this.GRID_ROW_ITEMS;
        } else {
          nextFocusIndex = this.focusIndex + 1;
        }
        if (undefined !== nextFocusIndex) {
          this.updateFocusItem(nextFocusIndex);
        }
        evt.stopPropagation();
        evt.preventDefault();
        break;
      case 'BrowserBack':
      case 'Backspace':
        evt.stopPropagation();
        evt.preventDefault();
        Service.request('BrowserMenuManager:hide');
        break;
      default:
        break;
    }
  }

  getGridContent() {
    let gridItems = [];
    this.props.options.forEach((option) => {
      if (option['data-icon']) {
        gridItems.push(
          <div className={'icon menu-item' + (option.disable ? ' disable' : '')}
          tabIndex='-1'
          data-icon={option['data-icon']}
          data-subtitle={option.subtitle}
          role="menuitem"
          aria-labelledby="option-menu-header"></div>);
      }
    });
    return (
      <div className='grid-container'>
        <div className='grid-row'>
          {gridItems.slice(0, this.GRID_ROW_ITEMS)}
        </div>
        <div className='grid-row'>
          {gridItems.slice(this.GRID_ROW_ITEMS)}
        </div>
      </div>);
  }

  render() {
    const gridContent = this.getGridContent();
    let options = [];
    this.props.options.forEach((option, index) => {
      if (option.id) {
        options.push(
          <div
            key={'option-' + index}
            tabIndex='-1'
            data-index={index}
            className='menu-item p-pri'
            role="menuitem">
            <div
              className='content'
              data-l10n-id={option.id || ''}
              data-l10n-args={option.l10nArgs || null}>
            </div>
          </div>
        );
      }
    });
    return (
      <div
        id='browser-options-menu'
        ref={(dom)=>{this.element=dom}}
        tabIndex='-1'
        onKeyDown={(e)=>this.onKeyDown(e)}
        onFocus={()=>this.onFocus()}
        role="menu">
        <div className='menu-container'>
          <div className="empty-container"></div>
          <div className='options-menu-content'>
            <div id='option-menu-header'
              ref={(dom)=>{this.header=dom}}
              data-l10n-id='options'
              className='header h1'
              key='translated-header'>
            </div>
            <div className='menu-content'>
              {gridContent}
              {options}
            </div>
          </div>
          <div className="empty-softkey-bar"></div>
        </div>
      </div>
    );
  }
}
