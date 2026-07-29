import MockOrientationManager from './mocks/mock_orientation_manager';
import MockManifestHelper from './mocks/mock_manifest_helper';
import MockAudioChannelController from './mocks/mock_audio_channel_controller';
import MockBrowser from './mocks/mock_browser';
import MockBrowserFrame from './mocks/mock_browser_frame';
import MockBrowserWindowButtons from './mocks/mock_browser_window_buttons';

import './mocks/mock_appOrigin.js';

global.OrientationManager = MockOrientationManager;
global.ManifestHelper = MockManifestHelper;
global.BrowserWindowButtons = MockBrowserWindowButtons;
global.AudioChannelController = MockAudioChannelController;
global.BrowserFrame = MockBrowserFrame;

require('../js/app_window');

describe('AppWindow', () => {
  const AppWindow = window.AppWindow;
  AppWindow.prototype.render = () => {};
  AppWindow.prototype.browser = MockBrowser;
  AppWindow.prototype.element = document.createElement('div');
  AppWindow.prototype.browserContainer = document.createElement('div');
  AppWindow.prototype.browserNavigationWidgets = {
    destroy: () => {}
  }

  test('navigate app -> browser', (done) => {
    const fakeSearchAppConfig = {
      url: 'http://system.localhost/browser/browser.html',
      manifestUrl: 'http://search.localhost/manifest.webmanifest',
      manifest: { role: 'search' },
      origin: 'http://search.localhost'
    };
    const app1 = new AppWindow(fakeSearchAppConfig);
    const url = 'http://changed.url';
    app1.reConfig = jest.fn();
    app1._unregisterAudioChannels = jest.fn();
    app1._registerAudioChannels = jest.fn();;
    AppWindow.prototype.browserContainer.removeChild = jest.fn();
    app1.navigate(url);

    expect(app1.reConfig.mock.calls.length).toBe(1);
    expect(app1._unregisterAudioChannels.mock.calls.length).toBe(1);
    expect(app1._registerAudioChannels.mock.calls.length).toBe(1);
    expect(app1.element.classList.contains('browser')).toBe(true);
    done();
  });

  describe('Sub component', () => {
    let app;

    test('installSubComponents', (done) => {
      const CustomEvent = window.CustomEvent;
      const fakeAppConfig = {
        url: 'http://www.fake/index.html',
        manifest: {},
        manifestURL: 'http://wwww.fake/manifest.webmanifest',
        origin: 'http://www.fake'
      };

      app = new AppWindow(fakeAppConfig);
      const element = app.browser.element;
      element.allowedAudioChannels = [
        { name: 'normal' },
        { name: 'content' }
      ];
      app.installSubComponents();
      element.dispatchEvent(new CustomEvent('loadstart'));

      expect(app.audioChannels.size).toBe(2);
      expect(app.audioChannels.get('normal').name).toBe('normal');
      expect(app.audioChannels.get('content').name).toBe('content');
      done();
    });

    test('uninstallSubComponents', (done) => {
      const normalChannel = app.audioChannels.get('normal');
      const contentChannel = app.audioChannels.get('content');
      normalChannel.destroy = jest.fn();
      contentChannel.destroy = jest.fn();
      app.uninstallSubComponents();
      expect(normalChannel.destroy.mock.calls.length).toBe(1);
      expect(contentChannel.destroy.mock.calls.length).toBe(1);
      expect(app.audioChannels).toBe(null);
      done();
    });
  });
});
