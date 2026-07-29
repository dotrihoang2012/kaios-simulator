/* eslint-disable max-len */
export default [
  { origin: window.AppOrigin.getOrigin('kaios-plus'), fixPosition: 0 },
  { manifestUrl: window.AppOrigin.getManifestURL('search'), fixPosition: 3 },
  { manifestUrl: window.AppOrigin.getManifestURL('kaios-news'), fixPosition: 4 },
  { origin: 'homescreen.carrier.folder', fixPosition: 6 },
  { manifestUrl: window.AppOrigin.getManifestURL('mymobill'), fixPosition: 11 },
  { manifestUrl: 'homescreen.search', fixPosition: 12 },
];
/* eslint-enable max-len */
