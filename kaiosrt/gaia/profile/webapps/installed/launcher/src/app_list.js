/* global AppStore */
import React from 'react';
import BaseComponent from 'base-component';
import EnhanceAnimation from 'enhance-animation';
import Service from 'service';
import SoftKeyStore from 'soft-key-store';
import throttle from 'lodash.throttle';
import SpeedDialHelper from './speed_dial_helper';
import AppItem from './AppList/AppItem';
import marquee from './AppList/marquee';
import ItemType from './AppStore/ItemType';
import shouldHide from './AppList/shouldHide';
import * as utils from './util/utils';
import LaunchStore from './util/launch_store';
import withNoticeIndicator from './AppNotice/NoticeIndicator';
import { eventLogger, EVENT_TYPES } from './eventlogger';
import { renameBookmark, unpinBookmark } from './AppList/bookmarkOperations';
import { uninstallApp } from './AppList/appOperations';
import {
  restoreUserSavedAppsOrder,
  calcAppsOrder,
  applyAppsOrder,
  saveAppsOrder,
  updateFixAppsOrder
} from './AppList/sortOperations';

import '../style/scss/app_list.scss';

const AppItemWithNotices = withNoticeIndicator(AppItem);

class AppList extends BaseComponent {
  name = 'AppList';

  static defaultProps = {
    viewMode: 'grid',
    col: 3,
    row: 3
  };

  static propTypes = {
    viewMode: React.PropTypes.string,
    col: React.PropTypes.number,
    row: React.PropTypes.number
  };

  navItemThrottleTime = 60;

  ready = false;

  menuOptions = [
    {
      id: 'rename',
      callback: () => {
        this.element.focus();
        this.focusIfPossible();
        renameBookmark(this.state.apps[this.focusIndex]);
      }
    },
    {
      id: 'move',
      tags: ['grid', 'list'],
      callback: this.enterReorderMode.bind(this)
    },
    {
      id: 'uninstall',
      callback: () => {
        let app = this.state.apps[this.focusIndex];
        this.element.focus();
        this.focusIfPossible();
        uninstallApp(app, app.displayName);
      }
    },
    {
      id: 'unpin',
      callback: () => {
        this.element.focus();
        this.focusIfPossible();
        unpinBookmark(this.state.apps[this.focusIndex]);
      }
    },
    {
      id: 'grid-view',
      tags: ['list', 'single'],
      callback: this.switchViewMode.bind(this, 'grid')
    },
    {
      id: 'list-view',
      tags: ['grid', 'single'],
      callback: this.switchViewMode.bind(this, 'list')
    },
    {
      id: 'single-view',
      tags: ['grid', 'list'],
      callback: this.switchViewMode.bind(this, 'single')
    }
  ];

  constructor(props) {
    super(props);
    this.initFocus = [0, 0];
    this.state = {
      col: this.props.col,
      apps: [],
      viewMode: this.props.viewMode,
      focus: this.initFocus
    };

    this.gridsPerPage = this.props.col * this.props.row;
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onFocus = this.onFocus.bind(this);
    this.currentPage = 0;
    this.fixPositionMode = false;

    // in normal case, `:focus` controls the highlight style.
    // we need to keep the icon to stay highlight style when blur by visibilitychange,
    // so add a class and remove the class when component focus
    window.addEventListener('visibilitychange', () => {
      let target = document.activeElement;

      let targetContainer = document.querySelector('.appList__container');
      let containerTop = targetContainer.getBoundingClientRect().top;
      let containerBottom = targetContainer.getBoundingClientRect().bottom;

      // If the current focus element is found not on the screen,
      // scroll it to appear on the current screen.
      if ((target.offsetTop - targetContainer.scrollTop > containerBottom
        || target.offsetTop - targetContainer.scrollTop < containerTop)
        && !document.hidden) {
        this.scrollIntoViewIfPossible(true);
      }

      if (document.hidden && this.appElements && [...this.appElements].includes(target)) {
        this.isStickyApp = true;
        target && target.classList.add('is-focus-app');
      }
    });

    // get viewMode in localStorage
    utils.asyncLocalStorage.getItem('app-view-mode').then((_mode) => {
      this.switchViewMode(_mode || this.state.viewMode);
    });

    // Access the saved app orders at first time.
    restoreUserSavedAppsOrder(this.checkFixPositionMode.bind(this));
  }

  componentDidMount() {
    /**
     * To prevent from continuously invoking the update callback,
     * we're throttling the incoming `change` events within the given duration.
     */
    AppStore.on('change',
      throttle(
        this.updateApps.bind(this),
        2000
      )
    );

    Service.register('show', this);
    Service.register('hide', this);
    Service.register('updateDefaultAppOrder', this);
    Service.registerState('ready', this);
    SpeedDialHelper.register(this.element);

    window.addEventListener('unload', this.unloadHandler);
  }

  componentDidUpdate(prevProps, prevState) {
    this.focusIfPossible();
    this.updateSoftKeys();
    this.scrollIntoViewIfPossible();
    this.updateMarquee();
    if (!this.ready) {
      this.ready = this.state.apps.length > 0;
    }
    if (this.state.apps !== prevState.apps) {
      const apps = this.state.apps
        .filter((item) => item.type !== 'folder')
        .map(({
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
      window.appDB.get('applist').then((data) => {
        if (data && data.apps) {
          window.appDB.update({ category: 'applist', apps }, 'applist');
        } else {
          window.appDB.add({ category: 'applist', apps }, 'applist');
        }
      });
    }
  }

  unloadHandler = () => {
    window.removeEventListener('unload', this.unloadHandler);
    SoftKeyStore.unregister(this.element);
    SpeedDialHelper.unregister(this.element);
  }

  updateMarquee() {
    let focusApp = this.element.getElementsByClassName('app')[this.focusIndex];
    if ((this.state.viewMode !== 'list') || this.state.reorderMode
      || !focusApp) {
      return;
    }
    let props = {
      item: this.state.apps[this.focusIndex],
      viewMode: this.state.viewMode
    };
    marquee.showMarquee(props, focusApp.querySelector('.app__name'));
  }

  updateDefaultAppOrder() {
    this.fixPositionMode = false;
    this.updateApps();
  }

  scrollIntoViewIfPossible(forceScroll = false) {
    switch (this.state.viewMode) {
      case 'grid':
        this.goPage(this.getPage(
          this.state.reorderMode ? this.reorder.focus[0] : this.state.focus[0]
        ), forceScroll);
        break;
      case 'list':
        this.scrollIntoViewForListView();
        break;
      case 'single':
        document.activeElement.scrollIntoView(false);
        break;
      default:
        break;
    }
  }

  scrollIntoViewForListView() {
    // check in viewport
    let wrapper = this._container;
    let wrapperRect = wrapper.getBoundingClientRect();
    let wrapperTop = wrapperRect.top;
    let wrapperHeight = wrapperRect.height;
    let target = document.activeElement;
    let targetRect = target.getBoundingClientRect();
    let targetTop = targetRect.top;
    let targetHeight = targetRect.height;
    let scrollTop = wrapper.scrollTop;
    let scrollY = null;
    if (targetTop < wrapperTop) {
      scrollY = scrollTop - (wrapperTop - targetTop);
    } else if (targetTop - wrapperTop > wrapperHeight - targetHeight) {
      scrollY =
        scrollTop + (targetTop - wrapperTop - (wrapperHeight - targetHeight));
    }
    if (scrollY !== null) {
      wrapper.scrollTo(0, scrollY);
    }
  }

  getPageCount() {
    return Math.ceil(this.state.apps.length / this.gridsPerPage);
  }

  getPage(row) {
    return Math.floor(row / (this.props.row));
  }

  goPage(page = this.currentPage, forceScroll) {
    if (!this.appElements || this.getPageCount() <= 1) {
      return;
    }
    if (this.currentPage !== page || forceScroll) {
      this.currentPage = page;
    }

    if (undefined === this.pageOffsetY) {
      this.pageOffsetY = (
        this.appElements[this.gridsPerPage].offsetTop - this.appElements[0].offsetTop
      );
    }
    this._container.scrollTop = this.pageOffsetY * page;
  }

  checkFixPositionMode() {
    const isFirstOpenLauncher = !localStorage.getItem('tutorial-has-viewed');
    const isFixPosition = !!localStorage.getItem('fix-position');
    if (isFixPosition || isFirstOpenLauncher) {
      this.fixPositionMode = true;
      !isFixPosition && utils.setLocalStorage('fix-position', 'v0.1');
    }
  }

  updateApps() {
    const needsToRefocusLater = this.element.contains(document.activeElement);
    let appsToRenders = AppStore.apps
      .filter((app) => !shouldHide(app))
      // The function that iterates all over the items,
      // to see if there's special case needs to update the in-memory apps-order.
      .map(calcAppsOrder)
      // Once the apps-order was settled down, we're ready to assign to items.
      .map(applyAppsOrder)
      .sort((a, b) => a.order - b.order);

    // Update app order when fix mode.
    if (this.fixPositionMode) {
      appsToRenders = updateFixAppsOrder(appsToRenders);
    }

    const appsToRender = appsToRenders
      .map((app, index) => {
        app.inlineStyle = {
          order: this.calculateCssOrder(index)
        };
        // Attach the `position` property onto the item
        // for event tracking purpose.
        app.position = index;
        return app;
      });

    this.setState(() => ({
      apps: appsToRender
    }), () => {
      // re-focus forcely, avoid for losing focus
      if (needsToRefocusLater) {
        this.focus();
        this.focusIfPossible();
      }
    });
  }

  updateSoftKeys(_keys = { center: 'select', right: 'options' }) {
    if (this.state.reorderMode) {
      _keys = { center: 'set', right: '', left: 'cancel' };
    }
    SoftKeyStore.register(_keys, this.element);
  }

  onFocus() {
    DUMP('Get list view onfocus!');
    // remove the temporary highlight class for fixing blur style with visibilitychange
    if (this.isStickyApp) {
      this.isStickyApp = false;
      let lastFocus = document.querySelector('.is-focus-app');
      if (lastFocus) {
        lastFocus.classList.remove('is-focus-app');
      }
    }

    if (this.element === document.activeElement) {
      // trigger scrollIntoViewIfPossible forcely to re-calc postion at beginning
      this.focusIfPossible();
      this.scrollIntoViewIfPossible();
      this.updateSoftKeys();
      this.updateMarquee();
      return;
    } else if (this.element.contains(document.activeElement)) {
      // skip
    } else {
      this.element.focus();
    }
    this.updateSoftKeys();
  }

  focusIfPossible() {
    if (!this.element.contains(document.activeElement)) {
      return;
    }
    let app = this.getFocusGridElement();
    if (app) {
      app.focus();
    } else {
      this.setState({ focus: this.initFocus });
    }
  }

  getFocusGridElement() {
    let focusIndex = utils.rowColToIndex(this.state.focus, this.state.col);
    let maxFocusIndex = this.state.apps.length - 1;
    if (focusIndex > maxFocusIndex) {
      focusIndex = maxFocusIndex;
      this.state.focus = utils.indexToRowCol(focusIndex, this.state.col);
    }
    this.focusIndex = focusIndex;
    if (!this.appElements) {
      this.appElements = this.element.getElementsByClassName('app');
    }
    return this.appElements[focusIndex];
  }

  enterReorderMode() {
    this.setState({
      reorderMode: true
    });
    this.reorder = {
      target: this.element.querySelectorAll('.app-tile')[this.focusIndex],
      focus: this.state.focus,
      app: this.state.apps[this.focusIndex],
      indexFrom: this.focusIndex,
      indexTo: this.focusIndex
    };
  }

  exitReorderMode(saved) {
    // Refactor this:
    this.setState((prevState) => {
      prevState.reorderMode = false;
      if (saved) {
        prevState.focus = [...this.reorder.focus];
        // Write the re-ordered apps back to the state.
        // So that the AppList will re-render with the new apps order.
        prevState.apps = prevState.apps
          .sort((a, b) => a.inlineStyle.order - b.inlineStyle.order)
          .map((app, index) => {
            app.inlineStyle = {
              order: this.calculateCssOrder(index)
            };
            return app;
          });
      } else {
        let index = this.focusIndex;
        prevState.apps[index].inlineStyle.order = (
          this.calculateCssOrder(index)
        );
      }
      return prevState;
    }, () => {
      this.reorder = {};
    });
  }

  saveCurrentAppsOrder() {
    const appsOrder =
      [...this.state.apps]
        .sort((a, b) => a.inlineStyle.order - b.inlineStyle.order)
        .map((app) => ({
          manifestUrl: app.manifestUrl,
          origin: app.origin || null,
          name: app.manifest.name,
        }));
    // Exit fix position mode.
    this.fixPositionMode = false;
    utils.setLocalStorage('fix-position', '');
    saveAppsOrder(appsOrder);
  }

  handleMoveGrid(nextRowCol) {
    let newIndex = utils.rowColToIndex(nextRowCol, this.state.col);
    let dir = this.focusIndex > newIndex ? -1 : 1;
    this.reorder.focus = nextRowCol;
    this.reorder.indexTo = newIndex;
    this.setState((prevState) => {
      prevState.apps[this.focusIndex].inlineStyle.order = (
        this.calculateCssOrder(newIndex, dir)
      );
      return prevState;
    });
  }

  switchViewMode(viewMode = 'grid') {
    let col = ('grid' === viewMode) ? this.props.col : 1;
    let _focusIndex = utils.rowColToIndex(this.state.focus, this.state.col);
    this.currentPage = null; // reset currentPage, and re-calc pages when componentDidUpdate
    this.setState({
      focus: utils.indexToRowCol(_focusIndex, col),
      col,
      viewMode
    });

    // update viewMode in localStorage
    utils.asyncLocalStorage.setItem('app-view-mode', viewMode);
  }

  navItem(nextRowCol) {
    if (this.navItemTimer) {
      return;
    }

    this.navItemTimer = setTimeout(() => {
      window.clearTimeout(this.navItemTimer);
      this.navItemTimer = null;
    }, this.navItemThrottleTime);

    if (this.state.reorderMode) {
      this.handleMoveGrid(nextRowCol);
    } else {
      this.setState({
        focus: nextRowCol
      });
    }
  }

  onKeyDown(evt) {
    let _reorderMode = this.state.reorderMode;
    let nextRowCol;
    var key = evt.key;
    switch (key) {
      case 'ArrowLeft':
      case 'ArrowRight':
        if ('grid' !== this.state.viewMode) {
          return;
        }
        if (utils.isRtl()) {
          key = ('ArrowLeft' === key) ? 'ArrowRight' : 'ArrowLeft';
        }
        // break omitted
      case 'ArrowUp':
      case 'ArrowDown': {
        let currentRowCol = _reorderMode ?
          (this.reorder.focus || this.state.focus) :
          this.state.focus;
        nextRowCol = utils.navGrid({
          currentRowCol,
          dir: key,
          col: this.state.col,
          total: this.state.apps.length
        });
        this.navItem(nextRowCol);
        break;
      }
      case 'Call':
        LaunchStore.launch('manifestUrl', window.AppOrigin.getManifestURL('communications'));
        break;
      case 'SoftRight':
        if (!_reorderMode) {
          let targetApp = this.state.apps[this.focusIndex];
          let options = this.menuOptions.filter((option) => {
            switch (option.id) {
              case 'uninstall':
                return (
                  ItemType.App === targetApp.type &&
                  targetApp.removable
                );
              case 'unpin':
              case 'rename':
                return ItemType.Bookmark === targetApp.type;
              default:
                if (option.tags) {
                  return option.tags.includes(this.state.viewMode);
                }
                return false;
            }
          });
          Service.request('showOptionMenu', { options });
        }
        break;
      case 'SoftLeft':
        if (_reorderMode) {
          this.exitReorderMode();
        }
        break;
      case 'Enter':
        if (_reorderMode) {
          this.saveCurrentAppsOrder();
          eventLogger.log({
            type: EVENT_TYPES.APP_POSITION,
            starting_position: this.reorder.indexFrom,
            end_position: this.reorder.indexTo,
            app_id: this.reorder.app.manifestUrl,
            app_version: this.reorder.app.manifest.version
          });
          this.exitReorderMode(true);
        } else {
          // launch app
          if (Service.query('LaunchStore.isLaunching')) {
            return;
          }
          LaunchStore.refreshLaunchStateTimer();
          LaunchStore.isLaunching = true;
          evt.target.click();
        }
        break;
      case 'EndCall':
      case 'BrowserBack':
      case 'Backspace':
        if (_reorderMode) {
          this.exitReorderMode();
        } else {
          this.exitListMode = true;
          this.setState({ focus: this.initFocus });
          Service.request('closeSheet', 'appList');
        }
        break;
      default:
        break;
    }
    if (nextRowCol) {
      evt.stopPropagation();
      evt.preventDefault();
    }
  }

  renderPagination() {
    let paginationDOM;
    let _currentPage = this.getPage(
      this.state.reorderMode ? this.reorder.focus[0] : this.state.focus[0]
    );
    const pageCount = this.getPageCount();
    if (pageCount > 1) {
      let pages = Array(pageCount).fill().map((page, i) => {
        let _class = (i === _currentPage) ? 'page-indicator active' : 'page-indicator';
        return (<div key={`page-indicator--${i}`} className={_class} />);
      });
      paginationDOM = <div className="pagination">{pages}</div>;
    }
    return paginationDOM;
  }

  calculateCssOrder(index, moveDir = 0) {
    // 1000: order base, affected total app count maximum
    return (index + 1 + (0.5 * moveDir)) * 1000;
  }

  render() {
    let paginationDOM = ('grid' === this.state.viewMode) ? this.renderPagination() : null;

    let _className = [
      'appList',
      this.state.reorderMode ? 'is-reordering' : ''
    ].filter(Boolean).join(' ');

    let needClearFlicker = this.exitListMode;
    this.exitListMode = false;

    return (
      <div
        className={_className}
        data-view-mode={this.state.viewMode}
        tabIndex="-1"
        onKeyDown={this.onKeyDown}
        onFocus={this.onFocus}
        ref={(node) => { this.element = node; }}
      >
        {paginationDOM}
        <h1 className="readout-only" id="all-apps" data-l10n-id="all-apps" />
        <div
          className="appList__container" role="heading" aria-labelledby="all-apps"
          ref={(ref) => (this._container = ref)}
        >
          <div className="app-wall">
            {this.state.apps.map((item) => (
              <AppItemWithNotices
                key={item.manifestUrl}
                manifestUrl={item.manifestUrl}
                item={item}
                position={this.state.focus}
                viewMode={this.state.viewMode}
                needClearFlicker={needClearFlicker}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
}

export default EnhanceAnimation(AppList, 'immediate', 'immediate');
