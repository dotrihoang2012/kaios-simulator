/* global emitter, CreateDB */
import React from 'react';
import ReactDOM from 'react-dom';
import BaseComponent from 'base-component';
import ReactSoftKey from 'react-soft-key';
import Service from 'service';
import GlobalEmitter from 'base-emitter';
import ReactSimChooser from 'react-sim-chooser';
import Tutorial from './tutorial/tutorial';
import MainView from './main_view';
import AppList from './app_list';
import Dialer from './dialer';
import Sidemenu from './sidemenu/sidemenu';
import FolderContainer from './Folder/folderContainer';
import DialogRenderer from './dialog_renderer';
import OptionMenuRenderer from './option_menu_renderer';
import GridHelper from './grid_helper';
import AppStore from './app_store';
import Cards from './cards';
import GetConnectExperience from './get_connect_experience';
import ForceSetting from './util/force_setting';
import forceSettingsName from './Configs/defaultForceSettingsName';
import { restoreUserSavedAppsOrder } from './AppList/sortOperations';
import './speed_dial_helper';
import '../style/scss/definitions.scss';
import '../style/scss/app.scss';

window.performance.mark('navigationLoaded');
window.addEventListener('load', () => {
  window.performance.mark('fullyLoaded');
  window.appDB = new CreateDB('apps', '1.0', 'category');

  // performance hack to load icons of hidden panels, i.e. AppList & SpeedDial
  document.body.classList.add('loaded');
  setTimeout(() => {
    document.body.classList.remove('loaded');
  }, 3000);
}, { once: true });

const servicesArray = [
  'settingsService',
  'appsService',
  'devicecapabilityService',
  'contactsService',
  'timeService',
  'powerService'
];
/* Session init */
console.log('Launcher libSession initService start load!'); // eslint-disable-line
window.libSession.initService(servicesArray).then(() => {
  SettingsObserver.init();  // SettingsObserver init
  DUMP('Launcher libSession initService loaded!');
})
.catch((err) => console.error('Launcher libSession initService error:', err));

class App extends BaseComponent {
  name = 'App';
  constructor(props) {
    super(props);
    this.panels = {};
    this.state = {
      grid: GridHelper.grid
    };
    this.forceSettings = {};

    window.emitter = new GlobalEmitter();
    window.AppStore = new AppStore();

    window.performance.mark('navigationInteractive');

    // When the main interface is out of focus, set the focus to mainView.
    document.body.addEventListener('keydown', (evt) => {
      if (evt.target === document.body && this.element.classList.length) {
        if (this.element.classList.length === 1) {
          let isTutorialShow = document
            .getElementById('Tutorial')
            .getAttribute('data-has-viewed');
          if (isTutorialShow === 'true') {
            document.getElementById('main-view').focus();
          }
        } else {
          const panelClassName = Array.from(this.element.classList).pop();
          const panelName = panelClassName.slice(
            panelClassName.indexOf('-') + 1,
            panelClassName.indexOf('--')
          );
          panelName && this.panels[panelName].focus();
        }
      }
      // When focus is on x-window, set focus to list view.
      if (evt.target === document.querySelector('.x-window') &&
        this.lastSheet === 'appList') {
        this.panels.appList.focus();
      }
    });
  }

  componentWillMount() {
    window.performance.mark('contentInteractive');
  }

  componentDidMount() {
    this.element = ReactDOM.findDOMNode(this);
    window.performance.mark('visuallyLoaded');

    // init panel
    this.focusWhenReady();

    window.addEventListener('visibilitychange', this);

    Service.register('openSheet', this);
    Service.register('closeSheet', this);
    Service.registerState('lastSheet', this);
    Service.registerState('forceSettings', this);
    Service.registerState('panelAnimationRunning', this);

    // Need to get these setting values before dom loads
    ForceSetting.getSettings().then((settings) => {
      this.forceSettings = settings;
      // Custom app order, need to remove fix position.
      if (settings[forceSettingsName[4]]) {
        AppStore.defaultAppsOrder = settings[forceSettingsName[4]];
        restoreUserSavedAppsOrder(() => {
          Service.request('updateDefaultAppOrder');
        }, settings[forceSettingsName[4]]);
      }
      // Custom tutorial.
      const customTutorial = settings[forceSettingsName[5]];
      Service.request('updateCustomTutorial', customTutorial);

      emitter.emit('getForceSettingsEnd', this.forceSettings);
    });

    this.element.style.setProperty('--grid-row', this.state.grid.row);
    this.element.style.setProperty('--grid-col', this.state.grid.col);
  }

  _handle_visibilitychange() {
    // When the focus back to launcher, focus onto the last sheet.
    const isVisible = !document.hidden;
    if (isVisible) {
      if (this.hasPopupDom()) return;
      switch (this.lastSheet) {
        case 'mainView':
          this.panels.mainView.focus();
          break;
        case 'appList':
          this.panels.appList.focus();
          break;
        default:
          break;
      }
    }
  }

  hasPopupDom() {
    let dialogDom =
      document.querySelector('#dialog-root .dialog-container');
    let optionMenu =
      document.querySelector('#menu-root .option-menu-container');
    let simChooser =
      document.querySelector('#sim-chooser .option-menu-container');

    if (dialogDom && window.getComputedStyle(dialogDom).display !== 'none') {
      !dialogDom.querySelector('input') && dialogDom.focus();
      return true;
    } else if (simChooser &&
      window.getComputedStyle(simChooser).display !== 'none') {
      simChooser.focus();
      return true;
    } else if (optionMenu &&
      window.getComputedStyle(optionMenu).display !== 'none') {
      optionMenu.focus();
      return true;
    }

    return false;
  }

  focusWhenReady() {
    if (!this.focusMainView()) {
      let handler = () => {
        this.focusMainView();
        document.removeEventListener('visibilitychange', handler);
      };
      document.addEventListener('visibilitychange', handler);
    }
  }

  focusMainView() {
    if (!Service.query('Tutorial.hasViewed')) {
      window.history.pushState(null, null, '#tutorial');
      Service.request('Tutorial:focus');
    } else {
      window.history.pushState(null, null, '#mainView');
      this.lastSheet = 'mainView';
      this.panels.mainView.focus();
    }
    return !document.hidden;
  }

  openSheet(ref) {
    let openFolderUrl = '';
    if (Array.isArray(ref)) {
      openFolderUrl = ref[1];
      ref = ref[0];
    }

    this.lastSheet = ref;
    if (this.panels[ref].open) {
      this.panels[ref].open();
    }
    DUMP('App openSheet = ' + ref);

    switch (ref) {
      case 'sidemenu':
        Service.request('Sidemenu:focus');
        break;
      case 'folder':
        Service.request('openFolder', openFolderUrl);
        break;
      default:
        break;
    }

    window.history.pushState(null, null, `#${ref}`);
    this.element.classList.add(`panel-${ref}--opened`);
    window.dispatchEvent(new CustomEvent('panelChange', {
      detail: {
        panel: this.lastSheet
      }
    }));
  }

  closeSheet(ref) {
    DUMP('App closeSheet = ' + ref);
    if (this.panels[ref].isClosed && this.panels[ref].isClosed()) {
      return;
    }
    if (this.panels[ref].close) {
      this.panels[ref].close();
    }
    this.element.classList.remove(`panel-${ref}--opened`);

    if (
      ('dialer' === ref || 'folder' === ref) &&
      !this.panels.appList.isClosed()
    ) {
      if (!document.hidden || ref === 'dialer') {
        this.panels.appList.focus();
      }
    } else {
      this.lastSheet = 'mainView';
      if (!document.hidden || ref === 'dialer') {
        this.panels.mainView.focus();
      }
    }

    window.history.pushState(null, null, `#${this.lastSheet}`);
    window.dispatchEvent(new CustomEvent('panelChange', {
      detail: {
        panel: this.lastSheet
      }
    }));
  }

  render() {
    return (
      <div className="app-workspace">
        <div className="app-content">
          <MainView ref={(node) => { this.panels.mainView = node; }} />
          <AppList ref={(node) => { this.panels.appList = node; }} {...this.state.grid} />
          <FolderContainer ref={(node) => { this.panels.folder = node; }} {...this.state.grid} />
          <Dialer ref={(node) => { this.panels.dialer = node; }} />
        </div>

        <Cards ref={(node) => { this.panels.cards = node; }} />
        <Tutorial ref={(node) => { this.panels.tutorial = node; }} />
        <Sidemenu ref={(node) => { this.panels.sidemenu = node; }} />
        <GetConnectExperience ref={(node) => { this.panels.experience = node; }} />
        <OptionMenuRenderer />
        <div id="sim-chooser">
          <ReactSimChooser />
        </div>
        <DialogRenderer />
        <ReactSoftKey ref={(node) => { this.panels.softKey = node; }} />
      </div>
    );
  }
}

ReactDOM.render(<App />, document.getElementById('root'));
