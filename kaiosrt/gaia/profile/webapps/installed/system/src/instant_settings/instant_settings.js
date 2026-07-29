/* global Service, SettingsObserver */

import React from 'react';
import BaseComponent from 'base-component';
import SoftKeyStore from 'soft-key-store';
import InstantSettingsStore from './instant_settings_store';
import EnhanceAnimation from '../enhance_animation'
import * as utils from '../util/utils';
import './instant_settings.scss';

const btnClassName = 'instantSettings__tile jio';

function VolumeBar(props) {
  const { config } = props;
  let percent = (config.value / config.maxValue).toFixed(2) * 100;
  return (
    <div className="instantSettings__volumeBar" data-percent={percent}>
      <div className="instantSettings__volumeBar__ball" style={{ left: `${percent}%` }} />
      <div className="instantSettings__volumeBar__stick" style={{ backgroundPosition: `${100 - percent}% 50%` }} />
    </div>
  );
}

function instantSettingJioItem(i) {
  let _className = [
    btnClassName,
    (i.isDisabled || i.isSetDisabled) ? 'is-disabled' : null,
    i.isActive ? 'is-active' : null,
    i.isShortcut ? 'is-shortcut' : null
  ].filter(Boolean).join(' ');

  let subtitle = i.subtitleTranslated ? i.subtitle : utils.toL10n(i.subtitle, i.subtitleArgs);
  if (i.hidden) {
    return '';
  }
  let iconName = i.isActive === false ? i.jio_icon.inactive : i.jio_icon.init;
  let focusIconName = iconName;
  if (i.jio_icon.inactive) {
    focusIconName = `${iconName}_focus`;
  }

  iconName = `../resources/jio_instant_settings/${iconName}.svg`;
  focusIconName = `../resources/jio_instant_settings/${focusIconName}.svg`;
  let title = utils.toL10n(i.title);
  return (
    <div
      key={i.name}
      className={_className}
      tabIndex="-1"
      data-name={i.name}
      aria-label={`${title} ${subtitle}`}
      role="button"
    >
      <div className="instantSettings__icon">
        <img src={iconName} />
        <img className='highlight' src={focusIconName} />
      </div>
      {('volume' === i.name) ? <VolumeBar config={i} /> : null}
      <div className="instantSettings__info">
        <div className="instantSettings__title">{title}</div>
        <div className="instantSettings__subtitle">{subtitle}</div>
      </div>
    </div>
  );
}

function instantSettingItem(i) {
  let _className = [
    btnClassName,
    (i.isDisabled || i.isSetDisabled) ? 'is-disabled' : null,
    i.isActive ? 'is-active' : null,
    i.isShortcut ? 'is-shortcut' : null
  ].filter(Boolean).join(' ');

  let subtitle = i.subtitleTranslated ? i.subtitle : utils.toL10n(i.subtitle, i.subtitleArgs);
  if (i.hidden) {
    return '';
  }
  let title = utils.toL10n(i.title);
  return (
    <div
      key={i.name}
      className={_className}
      tabIndex="-1"
      data-name={i.name}
      aria-label={`${title} ${subtitle}`}
      role="button"
    >
      <div
        className="instantSettings__icon"
        data-icon={i.icon.init}
        data-inactived-icon={i.icon.inactive}
      />
      {('volume' === i.name) ? <VolumeBar config={i} /> : null}
      <div className="instantSettings__info">
        <div className="instantSettings__title">{title}</div>
        <div className="instantSettings__subtitle">{subtitle}</div>
      </div>
    </div>
  );
}

class InstantSettings extends BaseComponent {
  name = 'InstantSettings';

  constructor(props) {
    super(props);

    this.initIndex = 6;
    this.initPrevFocusIndex = utils.isLandscape ? 0 : 3;
    this.prevFocusIndex = this.initPrevFocusIndex;
    this.isJioInstantSettings = false;
    this.checkWhetherJioStyle();
    window.Service.registerState('isJioInstantSettings', this);

    this.state = {
      settings: InstantSettingsStore.getSettingsInArray(),
      focusIndex: this.initIndex
    };

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onFocus = this.onFocus.bind(this);
    this.setRef = this.setRef.bind(this);

    this.grid = {
      col: utils.isLandscape ? 4 : 3,
      row: utils.isLandscape ? 2 : 3
    };
  }

  checkWhetherJioStyle() {
    const key = 'jio.instantSettings.enabled';
    SettingsObserver.getValue(key).then((value) => {
      if (value) {
        this.isJioInstantSettings = true;
        this.setState({
          settings: InstantSettingsStore.getSettingsInArray(),
          focusIndex: this.initIndex
        });
      }
    });
  }

  setHierarchy(value) {
    if (value) {
      if (this.element.contains(document.activeElement)) {
        return;
      }
      this.element.focus();
      this.updateSettings();
    } else {
      // clean up
      Service.request('InstantSettings:exit');
    }
  }

  componentDidMount() {
    this.btns = this.element.getElementsByClassName(btnClassName);
    window.Service.request('registerHierarchy', this);
    window.Service.register('exit', this);
    InstantSettingsStore.on('change', this.updateSettings.bind(this));
    InstantSettingsStore.toggleAllObservers(true);

    [
      'emergencyalert',
      'displayapp',
      'appopening',
      'activityopening',
      'attentionopening',
      'attentionopened',
      'screenchange'
    ].forEach(function(evt) {
      window.addEventListener(evt, () => {
        Service.request('InstantSettings:exit');
      });
    }, this);

    this.element.style.setProperty('--grid-col', this.grid.col);
    this.element.style.setProperty('--grid-row', this.grid.row);
  }

  componentDidUpdate() {
    if (!this.element.contains(document.activeElement)) {
      if (document.activeElement === document.body) {
        if (this.isActive()) {
          Service.request('focus');
        }
      }
      return;
    }
    this.initIndex =
      this.element.querySelectorAll('.instantSettings__tile').length - 1;
    if (this.state.focusIndex > this.initIndex) {
      this.state.focusIndex = this.initIndex;
    }
    this.focusIfPossible();
    this.updateSoftKey();
  }

  updateSoftKey() {
    let currentIndex = this.state.focusIndex;
    const settings =  this.state.settings.filter((module) => !module.hidden);
    let currentSetting = settings[currentIndex];
    if (this.lastElement && this.lastElement !== this.element) {
      SoftKeyStore.unregister(this.lastElement);
    }
    let cskDisabled = currentSetting.isDisabled || currentSetting.isSetDisabled;
    SoftKeyStore.register(currentSetting.softkey || {
      left: '',
      center: cskDisabled ? '' : utils.toL10n('select'),
      right: this.isJioInstantSettings ? utils.toL10n('settings') : ''
    }, this.element);
    this.lastElement = this.element;
  }

  updateSettings(newSettings = InstantSettingsStore.getSettingsInArray()) {
    this.setState((prevState) => {
      prevState.settings = newSettings;
      return prevState;
    });
  }

  onKeyDown(evt) {
    let key = evt.key;
    let currentIndex = this.state.focusIndex;
    switch (key) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        this.handleNavGrid(currentIndex, key);
        evt.preventDefault();
        break;
      case 'Enter': {
          let settings = this.state.settings.filter((module) => !module.hidden);
          let currentSetting = settings[currentIndex];
          if (!currentSetting.isDisabled && !currentSetting.isSetDisabled) {
            this.click(key, currentIndex);
          }
        }
        evt.preventDefault();
        break;
      case 'SoftRight':
        if (this.isJioInstantSettings) {
          const settingsApp = window.AppOrigin.getManifestURL('settings');
          InstantSettingsStore.launchApp(settingsApp);
          this.exit();
        }
        evt.preventDefault();
        break;
      case 'EndCall':
      case 'Backspace':
        this.exit();
        evt.preventDefault();
        break;
      default:
        break;
    }
  }

  onBlur() {
    this.exitTimer = window.setTimeout(() => {
      this.exitTimer = 0;
      Service.request('InstantSettings:exit');
    }, 100);
  }

  onFocus(evt) {
    // launch panel
    if (evt.target === this.element) {
      this.state.focusIndex = this.initIndex;
      window.addEventListener('visibilitychange', this);
      this.focusIfPossible();
    }
    if (this.exitTimer) {
      window.clearTimeout(this.exitTimer);
      this.exitTimer = 0;
    }
  }

  _handle_visibilitychange() {
    this.exit();
  }

  click(key, currentIndex = this.state.focusIndex) {
    const settings =  this.state.settings.filter((module) => !module.hidden);
    let currentSetting = settings[currentIndex];
    if (currentSetting.isDisabled) {
      return;
    }
    currentSetting && currentSetting.click && currentSetting.click(key);

    if ('launch' === currentSetting.clickType) {
      this.exit();
    }
  }

  handleNavGrid(currentIndex, key) {
    const settings =  this.state.settings.filter((module) => !module.hidden);
    let isVolume = ('volume' === settings[currentIndex].name);
    let isRtl = ('rtl' === document.dir);
    let col = 3;
    let total = this.initIndex + 1;
    let [_row, _col] = utils.indexToRowCol(currentIndex, col, total);
    let lastCol = col - 1;
    let lastRow = 2; // always 3 rows
    let returnPrev;

    switch (key) {
      case 'ArrowRight':
        if (isVolume && utils.isLandscape) {
          returnPrev = true;
        } else {
          _col = isRtl ? Math.max(_col - 1, 0) : Math.min(_col + 1, lastCol);
        }
        break;
      case 'ArrowLeft':
        if (utils.isLandscape && !(_col % col)) {
          _row = 2;
        }
        _col = isRtl ? Math.min(_col + 1, lastCol) : Math.max(_col - 1, 0);
        break;
      case 'ArrowUp':
        if (isVolume) {
          if (!utils.isLandscape) {
            returnPrev = true;
          }
        } else {
          _row = Math.max(_row - 1, 0);
        }
        break;
      case 'ArrowDown':
        if (!isVolume || !utils.isLandscape) {
          _row = Math.min(_row + 1, lastRow);
        }
        break;
      default:
        break;
    }

    let newIndex = (
      returnPrev
        ? this.prevFocusIndex
        : utils.clamp(utils.rowColToIndex([_row, _col], col, total), 0, total - 1)
    );

    if (newIndex !== currentIndex) {
      this.prevFocusIndex = currentIndex;
      this.setState({
        focusIndex: newIndex
      });
    } else if (isVolume) {
      this.debug('click on volume');
      this.click(key, currentIndex);
    }
  }

  exit() {
    if (this.lastElement) {
      this.prevFocusIndex = this.initPrevFocusIndex;
      window.removeEventListener('visibilitychange', this);
      SoftKeyStore.unregister(this.lastElement);
      window.clearTimeout(this.exitTimer);
      this.lastElement = null;
      this.exitTimer = 0;
      Service.request('InstantSettings:close');
    }
  }

  isHidden() {
    return !this.element.offsetParent;
  }

  focusIfPossible() {
    if (!this.element || this.isHidden()) {
      return;
    }

    let forcusTarget = this.element;
    if (this.btns) {
      forcusTarget = this.btns[this.state.focusIndex] || this.btns[this.initIndex];
    }
    forcusTarget.focus();
  }

  setRef = (node) => {
    this.element = node;
  }

  render() {
    return (
      <section
        className="instantSettings"
        tabIndex="-1" role="heading" aria-labelledby="instantSettings-title"
        onKeyDown={this.onKeyDown}
        onFocus={this.onFocus}
        onBlur={()=>{this.onBlur()}}
        ref={this.setRef}
      >
        <div className="readout-only" id="instantSettings-title">{utils.toL10n('instant-settings')}</div>
        <main className="instantSettings__wall">
          {
            this.state &&
            this.state.settings &&
            this.state.settings.map((i) => {
              if (this.isJioInstantSettings) {
                return instantSettingJioItem(i);
              } else {
                return instantSettingItem(i);
              }
            })
          }
        </main>
      </section>
    );
  }
}

export default EnhanceAnimation(InstantSettings, 'immediate', 'immediate');
