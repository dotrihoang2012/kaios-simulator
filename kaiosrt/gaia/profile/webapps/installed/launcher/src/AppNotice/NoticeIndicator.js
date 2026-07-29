import React from 'react';
import Service from 'service';
import AppNotices from '../AppNotice';

function withNoticeIndicator(ChildComponent) {
  return class extends React.Component {
    constructor(props) {
      super(props);
      this.newInstallInFolder = [];
      this.localNotice = Number(localStorage.getItem(
        `localNotice${this.props.manifestUrl}`
      ));
      this.newInstall = this.props.item.items ?
        this.getFolderNewInstallLocal() :
        localStorage.getItem(`newInstall${this.props.manifestUrl}`);

      this.state = {
        noticeCount: this.localNotice,
        newInstall: this.props.item.installFromStore || this.newInstall || false,
        clearNotices: localStorage.getItem(
          `clearNotices${this.props.manifestUrl}`
        )
      };

      this.noticeIndicatorRef = null;
      this.lastNoticeCount = this.localNotice;
      this.newInstallFlick = localStorage.getItem(
        `newInstallFlick${this.props.manifestUrl}`
      ) || this.props.item.installFromStore || false;

      this.handleChange = this.handleChange.bind(this);
      this.handleClearAppStatus = this.handleClearAppStatus.bind(this);
      this.handleAnimationEnd = this.handleAnimationEnd.bind(this);
      this.handleAnimationStart = this.handleAnimationStart.bind(this);

      this.initRegisterFunc();
    }

    componentDidMount() {
      AppNotices.on('change', this.handleChange);
      AppNotices.on('clearAppStatus', this.handleClearAppStatus);
      const app = this.props.item;

      if (app.items) {
        Service.request('addFolder', {
          name: app.basisname,
          url: this.props.manifestUrl
        });

        Service.register(`addFolderIndicator${app.showname}`, this);
        Service.register(`deleteFolderIndicator${app.showname}`, this);
        Service.register(this.clearFolderStatusUrl, this);
      }

      if (app.installFromStore) {
        this.setLocalStorage(`newInstall${this.props.manifestUrl}`, true);
      }

      if (AppNotices.notices) {
        this.handleChange();
      }
    }

    componentDidUpdate() {
      setTimeout(() => {
        // Exit list to clear the current notices flashing status
        this.props.needClearFlicker && this.clearFlicker();
        // Determine if the element that needs to be flashed exists on-screen
        if (!this.isCurrentScreenDisplayed()) return;

        let nextNoticeCount = this.state.noticeCount;
        if (nextNoticeCount > this.lastNoticeCount) {
          this.setLocalStorage(`clearNotices${this.props.manifestUrl}`);
        } else if (nextNoticeCount < this.lastNoticeCount) {
          this.setLocalStorage(`localNotice${this.props.manifestUrl}`,
            nextNoticeCount);
        }
        this.lastNoticeCount = nextNoticeCount;
        if (this.state.newInstall && this.newInstallFlick) {
          this.flicker();
        }
      }, 0);
    }

    componentWillUnmount() {
      AppNotices.off('change', this.handleChange);
      AppNotices.off('clearAppStatus', this.handleClearAppStatus);
    }

    getNoticeCount(notices, clearUrl) {
      let noticeCount = 0;
      if (this.props.item.items) {
        this.props.item.items.forEach((item) => {
          if (Object.keys(notices).indexOf(item.manifestUrl) !== -1) {
            noticeCount += notices[item.manifestUrl];
          }
          // Clear folder notices, when open folder app.
          const localClearNotice =
            localStorage.getItem(`clearNotices${item.manifestUrl}`);
          const isClearNotices = clearUrl && clearUrl === item.manifestUrl;
          const isNewNotices = notices.newNotice !== item.manifestUrl;
          if (isClearNotices || (localClearNotice && isNewNotices)) {
            if (noticeCount && notices[item.manifestUrl]) {
              noticeCount -= notices[item.manifestUrl];
            }
          }
        });
      } else {
        noticeCount = notices[this.props.manifestUrl] || 0;
      }

      return noticeCount;
    }

    getFolderNewInstallLocal(app = this.props.item) {
      if (app.items && app.items.length) {
        for (let i = 0; i < app.items.length; i++) {
          if (localStorage.getItem(`newInstall${app.items[i].manifestUrl}`)) {
            this.newInstallInFolder.push(app.items[i].manifestUrl);
          }
        }
        if (this.newInstallInFolder.length) {
          return true;
        }
      }
      return false;
    }

    setLocalStorage(key, value = '') {
      try {
        localStorage.setItem(key, value || '');
      } catch (err) {
        console.error(`set localNotice error:${err}`);
      }
    }

    initRegisterFunc() {
      if (this.props.item.items) {
        this[`addFolderIndicator${this.props.item.showname}`] = (app) => {
          if (this.newInstallInFolder.indexOf(app.manifestUrl) === -1) {
            this.setLocalStorage(`newInstallFlick${this.props.manifestUrl}`, 'true');
            this.newInstallFlick = true;
            this.newInstallInFolder.push(app.manifestUrl);
            this.setState({
              newInstall: true
            });
          }
        };

        this[`deleteFolderIndicator${this.props.item.showname}`] = (app) => {
          this.clearFlicker();
          const index = this.newInstallInFolder.indexOf(app.manifestUrl);
          if (index !== -1) {
            this.newInstallFlick = false;
            this.newInstallInFolder.splice(index, 1);
            this.setState({
              newInstall: !!this.newInstallInFolder.length
            });
          }
        };
      }

      if (this.props.manifestUrl) {
        this.clearFolderStatusUrl = 'clearFolderStatusUrl'
          + this.props.manifestUrl.slice(4);
        this[this.clearFolderStatusUrl] = () => {
          this.lastNoticeCount = this.getNoticeCount(AppNotices.notices);
          this.clearFlicker();
        };
      }
    }

    isCurrentScreenDisplayed() {
      let props = this.props;
      if (!props.viewMode) return false;
      if (props.viewMode === 'sideMenu') {
        return true;
      }

      if (!props.item.inlineStyle || !props.position) return false;

      const position = (props.item.inlineStyle.order / 1000) - 1;
      if (props.viewMode === 'grid') {
        return Math.floor(props.position[0] / 3) ===
          Math.floor(position / 9);
      } else {
        let appTopOffset = this.noticeIndicatorRef.getBoundingClientRect().top;
        if (appTopOffset === 0) {
          return position >= props.position[0]
            && position < props.position[0] + 4;
        }
        return appTopOffset > 0 && appTopOffset < 290;
      }
    }

    flicker() {
      if (this.noticeIndicatorRef) {
        const hasNotice = (this.lastNoticeCount > 0);
        const isFirstFlicker = !hasNotice || this.needFlicker;

        // Clean up all the existing flickering classes
        this.clearFlicker();

        if (isFirstFlicker) {
          this.needFlicker = false;
          this.noticeIndicatorRef.classList.add('first-flicker');
        } else {
          // Applying the flickering class until the next repaint.
          // Ref: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations/Tips#Run_an_animation_again
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
              this.noticeIndicatorRef.classList.add('flicker');
            });
          });
        }
      }
    }

    clearFlicker() {
      if (this.noticeIndicatorRef) {
        this.noticeIndicatorRef.classList.remove('first-flicker');
        this.noticeIndicatorRef.classList.remove('flicker');
      }
    }

    handleChange(notices) {
      notices = !notices ? AppNotices.notices : notices;
      const noticeCount = this.getNoticeCount(notices);
      let clearNotices = this.state.clearNotices;
      if (clearNotices && (noticeCount > this.lastNoticeCount ||
        notices.newNotice === this.props.manifestUrl)) {
        this.needFlicker = true;
        clearNotices = false;
        this.setLocalStorage(`clearNotices${this.props.manifestUrl}`, '');
      }
      this.setState({
        noticeCount,
        clearNotices
      });
    }

    handleClearAppStatus(manifestUrl) {
      if (manifestUrl === this.props.manifestUrl) {
        const app = this.props.item;
        if (app.manifest.categories) {
          Service.request(`deleteFolderIndicator${app.manifest.categories[0]}`, app);
        }
        this.setLocalStorage(`clearNotices${this.props.manifestUrl}`, 'true');
        this.setState({
          newInstall: false,
          clearNotices: true
        });
      } else if (this.props.item.items) {
        const folderNotices = this.getNoticeCount(AppNotices.notices, manifestUrl);
        this.setState({
          noticeCount: folderNotices
        });
      }
    }

    handleAnimationStart() {
      this.setLocalStorage(`localNotice${this.props.manifestUrl}`,
        this.lastNoticeCount);
      this.setLocalStorage(`newInstallFlick${this.props.manifestUrl}`);
      this.newInstallFlick = false;
    }

    handleAnimationEnd(event) {
      const isFlickerEnded = (event.animationName === 'opacityLastFadeIn');
      if (isFlickerEnded) {
        this.clearFlicker();
      }
    }

    render() {
      return (
        <ChildComponent
          hasNotices={this.state.noticeCount > 0 && !this.state.clearNotices}
          isNewInstall={this.state.newInstall}
          handleAnimationStart={this.handleAnimationStart}
          handleAnimationEnd={this.handleAnimationEnd}
          noticeIndicatorRef={(node) => { this.noticeIndicatorRef = node; }}
          {...this.props}
        />
      );
    }
  };
}

export default withNoticeIndicator;
