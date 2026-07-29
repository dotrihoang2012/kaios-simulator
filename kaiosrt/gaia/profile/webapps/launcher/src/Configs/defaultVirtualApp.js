export default [
  {
    name: 'internet',
    basisname: 'internet',
    enabled: true,
    url: window.AppOrigin.getManifestURL('search'),
    manifest: {
      icons: {
        '56': '../../style/images/browser_56.png',
        '112': '../../style/images/browser_112.png'
      }
    },
  },
  {
    name: 'Google Search',
    basisname: 'Google',
    enabled: true,
    url: 'homescreen.search',
    manifest: {
      start_url: 'https://www.google.com/search?client=%CLIENT_ID%',
      icons: {
        56: '../../style/images/google_search_56.png',
        112: '../../style/images/google_search_112.png',
      },
    },
  },
  {
    name: 'YouTube',
    basisname: 'YouTube',
    enabled: true,
    url: 'homescreen.youtube',
    manifest: {
      start_url: 'https://www.youtube.com',
      icons: {
        56: '../../style/images/youtube_56.png',
        112: '../../style/images/youtube_112.png',
      },
    },
  },
];
