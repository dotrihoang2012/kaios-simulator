const FAKE_GOOGLE_SEARCH_APP = {
  manifest: {
    name: 'Google Search',
    version: '1.0',
  },
  manifestUrl: window.AppOrigin.getManifestURL('googlesearch'),
  installState: 0,
  preloaded: true,
  removable: false,
};

let clientId = '';
SettingsObserver.getValue('google.client_id').then((id) => {
  clientId = id;
});

function isGoogleSearch(app) {
  return (
    app.isBrowser && app.isBrowser() &&
    app.url.indexOf(`https://www.google.com/search?client=${clientId}`) === 0
  );
}

export function patchAppObject(app) {
  if (isGoogleSearch(app)) {
    return FAKE_GOOGLE_SEARCH_APP;
  }
  return app;
};

export function patchInstalledApps(apps) {
  apps[window.AppOrigin.getManifestURL('googlesearch')] = FAKE_GOOGLE_SEARCH_APP;
  return apps;
}

