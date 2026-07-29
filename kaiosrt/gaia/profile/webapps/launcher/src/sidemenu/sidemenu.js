/* global AppStore, emitter */
import React from 'react';
import throttle from 'lodash.throttle';
import BaseComponent from 'base-component';
import SoftKeyStore from 'soft-key-store';
import Service from 'service';
import SidemenuItem from './SidemenuItem';
import ItemType from '../AppStore/ItemType';
import LaunchStore from '../util/launch_store';
import withNoticeIndicator from '../AppNotice/NoticeIndicator';
import { findItemByProps } from '../AppStore/ItemUtils';
import { appState, uninstallApp } from '../AppList/appOperations';
import { firstCarouselApps, secondCarouselApps } from '../Configs/defaultCarouselApps';
import forceSettingsName from '../Configs/defaultForceSettingsName';
import './sidemenu.scss';

const SidemenuItemWithNotices = withNoticeIndicator(SidemenuItem);
// const isEnabled = (item) => item.enabled && item.role !== 'invisible';
let defaultConfig = [];

export default class Sidemenu extends BaseComponent {
  name = 'Sidemenu';

  isActive = false;
  sidemenuItems = [];
  isShowAllApp = false;

  constructor(props) {
    super(props);
    this.state = {
      items: [],
      currentIndex: 0
    };

    /**
     * To prevent from continuously invoking the update callback,
     * we're throttling the incoming `change` events within the given duration.
     */
    AppStore.on('change',
      throttle(
        this.generateItems,
        1000
      )
    );

    Service.registerState('itemCount', this);
    emitter.on('getForceSettingsEnd', this.getForceSettingsEnd);
  }

  get itemCount() { return this.state.items.length; }

  get isCurrentItemUninstallable() {
    const { items, currentIndex } = this.state;
    return (
      items.length > 0 &&
      items[currentIndex] &&
      items[currentIndex].removable &&
      items[currentIndex].type === ItemType.App
    );
  }

  componentDidMount() {
    Service.register('focus', this);
    SoftKeyStore.register({
      left: '',
      center: 'select',
      right: ''
    }, this.element);
    window.addEventListener('unload', this.unloadHandler);
  }

  componentDidUpdate(prevProps, prevState) {
    if (appState.get('uninstalling')) {
      appState.set('uninstalling', false);
    }
    SoftKeyStore.register({
      left: '',
      center: 'select',
      right: this.isCurrentItemUninstallable ? 'options' : ''
    }, this.element);
    if (this.state.items !== prevState.items) {
      const apps = this.state.items.map(({
        name, displayName, type, role, manifest, manifestUrl, url
      }) => ({
        name,
        displayName,
        type,
        role,
        manifestUrl,
        url,
        manifest: type === 'virtual' ? manifest : undefined,
      }));
      window.appDB.get('sidemenu').then((data) => {
        if (data && data.apps) {
          window.appDB.update({ category: 'sidemenu', apps }, 'sidemenu');
        } else {
          window.appDB.add({ category: 'sidemenu', apps }, 'sidemenu');
        }
      });
    }
  }

  // Set sidemenu customization config.
  getForceSettingsEnd = (forceSettings) => {
    if (forceSettings &&
      !defaultConfig.length) {
      defaultConfig = forceSettings[forceSettingsName[2]] || firstCarouselApps;
      this.isShowAllApp = forceSettings[forceSettingsName[7]] || false;
    }
  }

  // If exist customization side menu, need show
  // default app in apps list menu.
  clearDefaultItemStatus() {
    defaultConfig.forEach((queryProps) => {
      const item = findItemByProps(AppStore.apps, queryProps);
      if (item && item.isInSidemenu) {
        item.isInSidemenu = false;
      }
    });
  }

  unloadHandler = () => {
    window.removeEventListener('unload', this.unloadHandler);
    SoftKeyStore.unregister(this.element);
  }

  generateItems = () => {
    const itemsToShow = defaultConfig
      .map((queryProps, index) => {
        const item = findItemByProps(AppStore.apps, queryProps);
        if (item) {
          // Mark that item has been moved to the SideMenu,
          // and will no longer show in AllApps screen.
          if (this.isShowAllApp ||
            item.manifestUrl === secondCarouselApps[index].manifestUrl) {
            item.isInSidemenu = false;
          } else {
            item.isInSidemenu = true;
          }
        } else if (!item && secondCarouselApps[index]) {
          // Replace the first default app with the second default app.
          return findItemByProps(AppStore.apps, secondCarouselApps[index]);
        }

        return item;
      })
      .filter(Boolean);

    this.setState({
      items: itemsToShow
    });

    const itemCount = itemsToShow.length;
    // Assistant needs to be the default app selected by everyone.
    const assistantIndex = itemsToShow
      .findIndex((item) => item.manifestUrl === firstCarouselApps[2]);
    const focusIndex = assistantIndex !== -1 ? assistantIndex : 2;

    this.entryIndex = Math.min(focusIndex, itemCount - 1);

    // When carousel is opened,
    // re-focus onto the corresponding index whenever any of item was updated.
    if (this.isActive) {
      if (itemCount === 0) {
        // Exit the carousel when list contains no item.
        this.exit();
      } else if (this.state.currentIndex + 1 > itemCount) {
        // If the last item was removed,
        // focus goes to the last item of the latest list.
        this.focusItem(itemCount - 1);
      } else {
        // After the target item was removed,
        // re-focus onto the same index after next item shifts in.
        this.focusItem(this.state.currentIndex);
      }
    }
  };

  onKeyDown = (evt) => {
    switch (evt.key) {
      case 'Enter':
        if (Service.query('LaunchStore.isLaunching')) {
          return;
        }
        LaunchStore.refreshLaunchStateTimer();
        LaunchStore.isLaunching = true;
        document.activeElement.click();
        requestAnimationFrame(() => {
          // Since spec v2.5R1.4 updated, a dirty work to force:
          // 1. SlideMenu exit in the background.
          // 2. Back to MainvView directly so that to force refresh the two views.
          this.exit();
          Service.request('MainView:forcedRefresh');
          Service.request('Clock:forcedRefresh');
        });
        break;
      case 'SoftRight':
        if (!appState.get('uninstalling')
          && !Service.query('LaunchStore.isLaunching')
          && this.isCurrentItemUninstallable) {
          const options = [{
            id: 'uninstall',
            callback: () => {
              this.focusItem(this.state.currentIndex);
              const currentApp = this.state.items[this.state.currentIndex];
              uninstallApp(currentApp, currentApp.displayName);
            }
          }];
          Service.request('showOptionMenu', { options });
        }
        break;
      case 'ArrowDown': {
        const itemCount = this.state.items.length;
        this.focusItem(Math.min(itemCount - 1, this.state.currentIndex + 1));
        break;
      }
      case 'ArrowUp':
        this.focusItem(Math.max(0, this.state.currentIndex - 1));
        break;
      case 'ArrowRight':
      case 'Backspace':
      case 'EndCall':
        this.exit();
        break;
      default:
        break;
    }
  };

  focusItem(index) {
    this.setState({
      currentIndex: index
    });
    this.sidemenuItems[index] && this.sidemenuItems[index].focus();
  }

  focus() {
    DUMP('Set sidemenu view focus!');
    if (this.sidemenuItems) {
      this.focusItem(this.entryIndex);
    } else {
      this.element.focus();
    }
    this.isActive = true;
  }

  exit() {
    this.isActive = false;
    Service.request('closeSheet', 'sidemenu');
  }

  render() {
    this.sidemenuItems = [];
    return (
      <div
        id="Sidemenu"
        className="Sidemenu"
        tabIndex="-1"
        onKeyDown={this.onKeyDown}
        ref={(node) => { this.element = node; }}
      >
        {this.state.items.map((item, index) => (
          <SidemenuItemWithNotices
            key={item.uid}
            index={index - this.state.currentIndex}
            manifestUrl={item.manifestUrl}
            domRef={(node) => { this.sidemenuItems[index] = node; }}
            item={item}
            viewMode={'sideMenu'}
            total={this.state.items.length}
          />
        ))}
      </div>
    );
  }
}
