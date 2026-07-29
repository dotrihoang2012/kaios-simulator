import { APPS_INSTALL_STATE_MAP } from '../constant';

export const deviceCapabilityLookupList = [
  ['device.capability.wifi.wifi_certified', 'device.wifi.certified'],
  ['device.capability.wifi', 'device.wifi'],
];
export const aggregatedLookupList = [...deviceCapabilityLookupList];

class APIAdapterHelper {
  constructor() {
    this.keysLookupMap = new Map(aggregatedLookupList);

    this.keysLookupMapReversed = new Map(
      aggregatedLookupList.map(([oldKey, newKey]) => {
        return [newKey, oldKey];
      })
    );

    this.remoteURLLookupMap = new Map();
    this.cachedManifests = new Map();
  }

  fetchAppManifest = ({ manifestUrl, updateManifestUrl }) => {
    const cachedManifest = this.cachedManifests.get(manifestUrl);
    const manifestPromise = cachedManifest
      ? Promise.resolve(cachedManifest)
      : fetch(manifestUrl).then(res => res.json());

    if (updateManifestUrl) {
      return Promise.allSettled([
        manifestPromise,
        fetch(updateManifestUrl).then(res => res.json()),
      ]).then(([manifest, updateManifest]) => {
        return [manifest.value, updateManifest.value];
      });
    }

    return manifestPromise.then(appManifest => [appManifest]);
  };

  getB2GFeature = (appManifest, field, defaultVaule) => {
    if (!appManifest || !appManifest.b2g_features) return defaultVaule;

    return appManifest.b2g_features[field] || defaultVaule;
  };

  /**
   * @param {string} key use to get compatible key
   * @returns {string} compatible key in lookupMap or reversedLookupMap, if couldn't find any key in those two Map return the param directly.
   */
  transformKey = key => {
    const typeOfParam = typeof key;

    if (typeOfParam !== 'string') {
      console.warn(
        `APIAdapterHelper.transformKey only accept string as param: current param is type of ${typeOfParam}`
      );
      return key;
    }

    const transformedKey = this.keysLookupMap.get(key)
      ? this.keysLookupMap.get(key)
      : this.keysLookupMapReversed.get(key);

    return transformedKey || key;
  };

  addAppRemoteURL = ({ manifestUrl, updateUrl }) => {
    const remoteUrl = updateUrl || manifestUrl;

    this.remoteURLLookupMap.set(manifestUrl, remoteUrl);
  };

  /**
   * @param {string} url should be manifestUrl from appsObject and use to get remoteURL properly.
   * @returns {string} should return remoteURL of the app.
   */
  getAppRemoteURL = manifestUrl => {
    const remoteURL = this.remoteURLLookupMap.get(manifestUrl);

    if (!remoteURL) {
      console.warn(
        'APIAdapterHelper.getAppRemoteURL failed to get remoteURL by: ',
        manifestUrl
      );
      return manifestUrl;
    }

    return remoteURL;
  };

  transformCompatibleAppsObject = (
    appsObj,
    { shouldFetchManifest = true } = {}
  ) => {
    // Filter out manifestUrl from appsObj
    const { manifestUrl, updateManifestUrl, ...filteredAppsObj } = appsObj;
    const defaultManifest = {
      updateURL: filteredAppsObj.updateUrl,
    };
    const transFormedAppObj = {
      ...filteredAppsObj,
      // Use manifestURL as key for backward compatible.
      manifestURL: manifestUrl,
      downloadSize: 0,
      installState: APPS_INSTALL_STATE_MAP.get(filteredAppsObj.installState),
      manifest: defaultManifest,
      progress: 0,
      updateManifest: null,
    };

    this.addAppRemoteURL({
      manifestUrl,
      updateUrl: filteredAppsObj.updateUrl,
    });

    if (!shouldFetchManifest) {
      return Promise.resolve(transFormedAppObj);
    }

    return this.fetchAppManifest({
      manifestUrl,
      updateManifestUrl,
    })
      .then(([appManifest, appUpdateManifest = {}]) => {
        if (appManifest && !this.cachedManifests.has(manifestUrl)) {
          this.cachedManifests.set(manifestUrl, appManifest);
        }

        const defaultLocale =
          appUpdateManifest.default_locale || appManifest.lang || 'en-US';
        const fallbackLocales = {
          [defaultLocale]: {
            name: appUpdateManifest.name || appManifest.name,
            description:
              appUpdateManifest.description || appManifest.description,
          },
        };

        return {
          ...transFormedAppObj,
          manifest: {
            ...transFormedAppObj.manifest,
            name: appManifest.name,
            icons: appManifest.icons || [],
            core: this.getB2GFeature(appManifest, 'core', false),
            reboot: this.getB2GFeature(appManifest, 'reboot', false),
            version: this.getB2GFeature(appManifest, 'version', '0'),
            activities: this.getB2GFeature(appManifest, 'activities', null),
          },
          updateManifest: {
            ...transFormedAppObj.updateManifest,
            ...appUpdateManifest,
            default_locale: defaultLocale,
            locales: appUpdateManifest.locales || fallbackLocales,
            version:
              appUpdateManifest.version ||
              this.getB2GFeature(appManifest, 'version', '0'),
          },
        };
      })
      .catch(e => {
        console.error(
          `APIAdapterHelper failed to transform appsObject - manifestUrl: ${manifestUrl}`,
          e
        );
        return transFormedAppObj;
      });
  };
}

export default new APIAdapterHelper();
