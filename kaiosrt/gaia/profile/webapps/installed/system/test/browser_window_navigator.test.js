import MockNavigatorDatastore from './mocks/mock_navigator_datastore';
import MockAppWindowManager from './mocks/mock_app_window_manager.js';
import './mocks/l10n';
import '../js/service.js';

global.appWindowManager = MockAppWindowManager;
global.BrowserPinSitesDataStore = function() {return MockNavigatorDatastore;};


require('../js/browser_window_navigator');

describe('BrowserWindowNavigator', () => {
  const BrowserWindowNavigator = window.BrowserWindowNavigator;

  test('Build option menu when browser page loaded', (done) => {
    const fakeAppChrome = {
      app: {
        url: 'test url',
        element: document.createElement('div'),
        browser: {
          element: document.createElement('div'),
          focusElement: document.createElement('div'),
          addEventListener: function(eventName, callback) {}
        },
        back: () => {},
        forward: () => {},
        reload: () => {},
        loading: false,
        contextmenu: {
          hasAction: function(type) {return false;}
        },
        viewLatestMessage: function() {}
      }
    };
    const browserWindowNavigator = new BrowserWindowNavigator(fakeAppChrome);
    // sinon.stub(appWindowManager, 'display');
    browserWindowNavigator.pinToTopSites = jest.fn();
    browserWindowNavigator.pinToAppsMenu = jest.fn();
    let menu = browserWindowNavigator.buildOptionMenu();
    // expected menu has: volume, refresh, goToTopSites,
    // pinToTopSites, pinToAppsMenu, share, minimizeBrowser
    expect(menu.length).toBe(11);
    // has 'pinToTopSites'
    expect(menu.some((element) => {return element.subtitle === 'pinTo'})).toBe(true);
    // six element should be 'pinTo'
    expect(menu[6].subtitle).toBe('pinTo');
    // has 'hideShortcutTips'
    expect(menu.some((element) => {return element.id === 'hideShortcutTips'})).toBe(true);
    done();
  });

  test('pinToAppsMenu', (done) => {
    const fakeAppChrome = {
      app: {
        element: document.createElement('div'),
        browser: {
          element: document.createElement('div'),
          focusElement: document.createElement('div'),
          addEventListener: function(eventName, callback) {}
        }
      },
      addBookmark: jest.fn(() => Promise.resolve({}))
    };
    const browserWindowNavigator = new BrowserWindowNavigator(fakeAppChrome);
    Service.request = jest.fn();
    browserWindowNavigator.pinToAppsMenu();
    expect(fakeAppChrome.addBookmark.mock.calls.length).toBe(1);
    fakeAppChrome.addBookmark().then(() => {
      expect(Service.request.calledWith(
        'SystemToaster:show',
        {textL10n:'pinSiteToAppsMenuCompletely'}
      )).toBe(true);
    });
    done();
  });
});
