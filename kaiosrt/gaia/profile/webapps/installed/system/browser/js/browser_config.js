const config = {
  DEBUG: false,

  CACHE_EXPIRATION_TIME: 24 * 60 * 60 * 1000,
  LAST_CACHED_TIME_KEY: 'last-cached-time',
  RECOMMENDED_CHCHE_KEY: 'browser-recommended-apps',

  MAX_HISTORY_RESULTS: 100,

  storeLink: 'app://kaios-store.kaiostech.com',

  // Basic functions
  basics: [
    {
      id: 'search',
      icon: 'style/img/ic_search_internet.png'
    },
    {
      id: 'history',
      icon: 'style/img/ic_history.png'
    },
    {
      id: 'store',
      icon: 'style/img/ic_store.png',
      deepLink: true
    }
  ]
}

export default config;
