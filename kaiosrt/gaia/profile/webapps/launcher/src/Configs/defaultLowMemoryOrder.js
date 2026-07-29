/* eslint-disable max-len */
export const defaultLowMemoryAppsOrder = [
  { name: 'KaiOS-Store', origin: window.AppOrigin.getOrigin('kaios-plus') },
  { name: 'Contact', manifestUrl: window.AppOrigin.getManifestURL('contact') },
  { name: 'Call Log', manifestUrl: window.AppOrigin.getManifestURL('communications') },
  { name: 'Browser', manifestUrl: window.AppOrigin.getManifestURL('search') },
  { name: 'KaiNews', manifestUrl: window.AppOrigin.getManifestURL('kaios-news') },
  { name: 'KaiWeather', manifestUrl: window.AppOrigin.getManifestURL('kaios-weather') },
  { name: 'Messages', manifestUrl: window.AppOrigin.getManifestURL('sms') },
  { name: 'Camera', manifestUrl: window.AppOrigin.getManifestURL('camera') },
  { name: 'Gallery', manifestUrl: window.AppOrigin.getManifestURL('gallery') },
  { name: 'Clock', manifestUrl: window.AppOrigin.getManifestURL('clock') },
  { name: 'MyMoBill', manifestUrl: window.AppOrigin.getManifestURL('mymobill') },
  { name: 'Search', manifestUrl: 'homescreen.search' },
  { name: 'Calendar', manifestUrl: window.AppOrigin.getManifestURL('calendar') },
  { name: 'Horoscope', origin: 'https://m.myhoroscope.io' },
  { name: 'Music', manifestUrl: window.AppOrigin.getManifestURL('music') },
  { name: 'Settings', manifestUrl: window.AppOrigin.getManifestURL('settings') },
  { name: 'KaiPay', origin: window.AppOrigin.getOrigin('kaios-pay') },
  { name: 'Calculator', manifestUrl: window.AppOrigin.getManifestURL('calculator') },
  { name: 'Gems', origin: 'app://kaios.gems.net' },
  { name: 'Guardians', origin: 'app://kaios.guardians.net' },
  { name: 'Video', manifestUrl: window.AppOrigin.getManifestURL('video') },
  { name: 'ToDo', origin: 'app://kaios.todo.net' },
  { name: 'FM Radio', manifestUrl: window.AppOrigin.getManifestURL('fm') },
  { name: 'File Manager', manifestUrl: window.AppOrigin.getManifestURL('filemanager') },
  { name: 'stk', manifestUrl: window.AppOrigin.getManifestURL('stk') },
];

export const defaultLowMemoryFolderApp = [
];
/* eslint-enable max-len */
