/* global AppStore */
import React from 'react';
import BaseComponent from 'base-component';
import throttle from 'lodash.throttle';
import Service from 'service';
import SoftKeyStore from 'soft-key-store';
import AppItem from '../AppList/AppItem';
import withNoticeIndicator from '../AppNotice/NoticeIndicator';
import { unescapeNumericHTMLEntities } from '../util/html_entities';
import { uninstallApp } from '../AppList/appOperations';
import * as utils from '../util/utils';
import {
  findFolderByManifestURL,
  findItemByManifestURL,
  findItemByOrigin
} from '../AppStore/ItemUtils';

const AppItemWithNotices = withNoticeIndicator(AppItem);
// const isEnabled = (item) => item.enabled && item.role !== 'invisible';

class Folder extends BaseComponent {
  name = 'Folder';

  defaultState = {
    manifestUrl: null,
    folder: null,
    itemsToRender: [],
    focusIndex: 0,
    reorderMode: false
  };
  optionMenu = [{
    id: 'move',
    callback: () => {
      this.setState({
        reorderMode: true
      });
      this.reorderFocusIndex = this.state.focusIndex;
    }
  }, {
    id: 'uninstall',
    callback: () => {
      const app = this.getApp();
      this.element.focus();
      this.setItemFocus();
      uninstallApp(app, app.displayName);
    }
  }];
  state = this.defaultState;

  reorderFocusIndex = 0;

  componentWillReceiveProps(nextProps) {
    if (this.props.manifestUrl !== nextProps.manifestUrl) {
      this.updateFolder({
        manifestUrl: nextProps.manifestUrl
      });
    }
  }
  componentWillMount() {
    this.updateFolder({ manifestUrl: this.props.manifestUrl });
    AppStore.on('updateFolderList', this.updateFolderList.bind(this));
    AppStore.on('change',
      throttle(
        this.updateAllList,
        1000
      )
    );
  }

  componentDidMount() {
    window.addEventListener('unload', this.unloadHandler);
    this.addAppsToDB();
  }

  addAppsToDB() {
    const apps = this.state.itemsToRender.map(({
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
    const folderName = `folder_${this.state.folder.showname}`;
    window.appDB.get(folderName).then((data) => {
      if (data && data.apps) {
        window.appDB.update({ category: folderName, apps }, folderName);
      } else {
        window.appDB.add({ category: folderName, apps }, folderName);
      }
    }, (err) => {
      console.error('Error occurred while setting folder into indexeddb.', err);
    });
  }

  componentDidUpdate(prevProps, prevState) {
    this.updateSoftKeys();

    this.setItemFocus();

    if (this.state.itemsToRender !== prevState.itemsToRender) {
      this.addAppsToDB();
    }
  }

  setItemFocus() {
    this.element.focus();
    const appItems = this.element.querySelectorAll('.app');
    const appItemToBeFocused = appItems[this.state.focusIndex];
    if (appItemToBeFocused) {
      appItemToBeFocused.focus();

      const containerRect = this.listContainer.getBoundingClientRect();
      const itemRect = appItemToBeFocused.getBoundingClientRect();
      if (itemRect.top <= containerRect.top) {
        appItemToBeFocused.scrollIntoView(true);
      } else if (itemRect.bottom >= containerRect.bottom) {
        appItemToBeFocused.scrollIntoView(false);
      }
    }
  }

  unloadHandler = () => {
    window.removeEventListener('unload', this.unloadHandler);
    SoftKeyStore.unregister(this.element);
  }

  updateFolderList(name) {
    if (name !== this.props.name) {
      return;
    }

    this.updateFolder({ manifestUrl: this.props.manifestUrl });
  }

  updateAllList = () => {
    this.updateFolder({ manifestUrl: this.props.manifestUrl });
  }

  getApp() {
    const index = this.state.focusIndex;
    return this.state.itemsToRender[index];
  }

  getNextIndex(softKey) {
    const index = this.state.reorderMode ?
      this.reorderFocusIndex : this.state.focusIndex;
    const items = this.state.itemsToRender;
    const isListView = this.props.viewMode !== 'grid';

    if (utils.isRtl() &&
      ('ArrowLeft' === softKey || 'ArrowRight' === softKey)) {
      softKey = ('ArrowLeft' === softKey) ? 'ArrowRight' : 'ArrowLeft';
    }

    if (softKey === 'ArrowLeft' || (isListView && softKey === 'ArrowUp')) {
      return index ? index - 1 : items.length - 1;
    }

    if (softKey === 'ArrowRight' || (isListView && softKey === 'ArrowDown')) {
      return index === items.length - 1 ? 0 : index + 1;
    }

    const currentRowCol = [
      Math.ceil((index + 1) / this.props.col) - 1,
      index % this.props.col
    ];

    const nextRowCol = utils.navGrid({
      currentRowCol,
      dir: softKey,
      col: this.props.col,
      total: items.length
    });

    const nextIndex = (nextRowCol[0] * this.props.col) + nextRowCol[1];

    return nextIndex;
  }

  switchItem = (softKey) => {
    const nextIndex = this.getNextIndex(softKey);
    const dir = this.state.focusIndex > nextIndex ? -1 : 1;
    const items = this.state.itemsToRender;
    items[this.state.focusIndex].inlineStyle.order = (
      this.calculateCssOrder(nextIndex, dir)
    );
    this.reorderFocusIndex = nextIndex;
    return items;
  }

  updateFolder = ({ manifestUrl }) => {
    const folder = findFolderByManifestURL(AppStore.apps, manifestUrl);
    if (!folder) {
      return;
    }

    const itemsToRender = folder.items
      .map((item) => findItemByManifestURL(AppStore.apps, item.manifestUrl) ||
        (item.origin && findItemByOrigin(AppStore.apps, item.origin)))
      .filter(Boolean)
      .map((item, index) => {
        // Since we're accessing shared items via AppStore,
        // we need to clean up the inline styles from the existing state
        // before rendering it to the Folder component.
        item.inlineStyle = {
          order: (index + 1) * 1000
        };
        item.position = index;
        // if (item) {
        //   return isEnabled(item) && item;
        // }
        return item;
      })
      .filter(Boolean);

    const maxLength = Math.max(itemsToRender.length - 1, 0);
    const focusIndex = this.state.focusIndex > maxLength
      ? maxLength : this.state.focusIndex;

    this.setState({
      manifestUrl,
      folder,
      itemsToRender,
      focusIndex
    });
  };

  saveItemOrder(prevState) {
    const items = prevState.folder.items;
    const itemsToRender = prevState.itemsToRender;
    const findItemOrder = (url) => {
      return itemsToRender.findIndex((app) => {
        if (url === app.manifestUrl || url === app.origin) {
          return true;
        }
        return false;
      });
    };
    items.sort((a, b) => {
      const aUrl = a.manifestUrl || a.origin;
      const bUrl = b.manifestUrl || b.origin;
      return findItemOrder(aUrl) - findItemOrder(bUrl);
    });
    Service.request('updateFolderOrder', {
      name: this.props.name,
      items: items
    });
  }

  calculateCssOrder(index, moveDir = 0) {
    // 1000: order base, affected total app count maximum
    return (index + 1 + (0.5 * moveDir)) * 1000;
  }

  exit = () => {
    this.exitFolderMode = true;
    Service.request('clearFolderStatusUrl' + this.props.manifestUrl.slice(4));
    this.setState({
      focusIndex: 0
    });
  };

  exitReorderMode(saved) {
    this.setState((prevState) => {
      prevState.reorderMode = false;
      if (saved) {
        prevState.focusIndex = this.reorderFocusIndex;
        prevState.itemsToRender = prevState.itemsToRender
          .sort((a, b) => a.inlineStyle.order - b.inlineStyle.order)
          .map((app, index) => {
            app.inlineStyle = {
              order: this.calculateCssOrder(index)
            };
            return app;
          });
        this.saveItemOrder(prevState);
      } else {
        // Reset app order.
        prevState.itemsToRender.forEach((item, index) => {
          item.inlineStyle = {
            order: (index + 1) * 1000
          };
        });
      }
      return prevState;
    });
  }

  updateSoftKeys = (keyMap = { center: 'select', right: 'options' }) => {
    if (this.state.reorderMode) {
      keyMap = { left: 'cancel', center: 'set' };
    }
    SoftKeyStore.register(keyMap, this.element);
  };

  onKeyDown = (event) => {
    const key = event.key;
    switch (key) {
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown':
        event.preventDefault();
        this.setState((prevState) => ({
          itemsToRender: prevState.reorderMode ?
            this.switchItem(key) : prevState.itemsToRender,
          focusIndex: prevState.reorderMode ?
            prevState.focusIndex : this.getNextIndex(key)
        }));
        break;
      case 'Enter':
        if (this.state.reorderMode) {
          this.exitReorderMode(true);
        } else {
          event.target.click();
        }
        break;
      case 'EndCall':
      case 'BrowserBack':
      case 'Backspace':
        if (this.state.reorderMode) {
          event.stopPropagation();
          event.preventDefault();
          this.exitReorderMode(false);
        } else {
          this.exit();
        }
        break;
      case 'SoftLeft':
        if (this.state.reorderMode) {
          this.exitReorderMode(false);
        }
        break;
      case 'SoftRight': {
        if (this.state.reorderMode) {
          return;
        }
        let options = this.optionMenu.filter((option) => {
          if (!this.getApp().removable && option.id === 'uninstall') {
            return false;
          }
          return true;
        });
        Service.request('showOptionMenu', { options });
        break;
      }
      case 'Call':
      default:
        // Not in use
        break;
    }
  };

  render() {
    let needClearFlicker = this.exitFolderMode;
    let _className = [
      'appList',
      'folder',
      this.props.isShow ? '' : 'hidden',
      this.state.reorderMode ? 'is-reordering' : ''
    ].filter(Boolean).join(' ');
    let viewMode = this.props.viewMode === 'grid' ?
      'grid' : 'list';
    this.exitFolderMode = false;
    return (
      <div
        className={_className}
        data-view-mode={viewMode}
        tabIndex="-1"
        onKeyDown={this.onKeyDown}
        ref={(node) => { this.element = node; }}
      >
        {
          viewMode === 'grid' ? null :
          <header>
            <h1>
              {this.state.folder &&
                unescapeNumericHTMLEntities(this.state.folder.displayName)}
            </h1>
          </header>
        }
        <div
          className="appList__container"
          ref={(node) => { this.listContainer = node; }}
        >
          <div className="app-wall">
            {this.state.itemsToRender.map((item) => (
              <AppItemWithNotices
                key={item.manifestUrl}
                item={item}
                manifestUrl={item.manifestUrl}
                viewMode={viewMode}
                position={[Math.floor(this.state.focusIndex / 3)]}
                needClearFlicker={needClearFlicker}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
}

export default Folder;
