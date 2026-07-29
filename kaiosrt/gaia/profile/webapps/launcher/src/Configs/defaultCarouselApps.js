/* eslint-disable max-len */
const getWAPManifestUrl = (name) => {
  return `http://cached.localhost/${name}/manifest.webmanifest`;
};

export const firstCarouselApps = [
  { name: 'WhatsApp', manifestUrl: window.AppOrigin.getManifestURL('whatsapp') },
  { name: 'Facebook', manifestUrl: window.AppOrigin.getManifestURL('facebook') },
  { name: 'Assistant', manifestUrl: window.AppOrigin.getManifestURL('assistant') },
  { name: 'Maps', manifestUrl: getWAPManifestUrl('maps') },
  { name: 'YouTube', manifestUrl: 'homescreen.youtube' },
];

export const secondCarouselApps = [
  { name: 'KaiOS-Store', manifestUrl: window.AppOrigin.getManifestURL('kaios-plus') },
  { name: 'Browser', manifestUrl: window.AppOrigin.getManifestURL('search') },
  { name: 'Search', manifestUrl: 'homescreen.search' },
  { name: 'KaiNews', manifestUrl: window.AppOrigin.getManifestURL('kaios-news') },
  { name: 'KaiWeather', manifestUrl: window.AppOrigin.getManifestURL('kaios-weather') },
];
/* eslint-enable max-len */
