/* global AppStore */
import Customization from '../Customization';
import defaultAppsOrder from '../Configs/defaultAppsOrder';
import defaultFixPositionApps from '../Configs/defaultFixPositionApps';
import { defaultLowMemoryAppsOrder } from '../Configs/defaultLowMemoryOrder';
import { matcher } from '../AppStore/ItemUtils';
import * as utils from '../util/utils';

const v1FormatKey = 'app-order';
const v2FormatKey = 'apps-order-v2';
const stkApp = {
  manifestUrl: window.AppOrigin.getManifestURL('stk'),
  origin: window.AppOrigin.getOrigin('stk')
};

let inMemoryOrder = null;

export function restoreUserSavedAppsOrder(callback, order) {
  /**
   * Restore saved apps-order from localStorage.
   * Note that we'll upgrade v1 format into v2 while only v1 exists.
   *
   * v1 format: Apps order that only contains app name.
   * v2 format: Apps order that contains manifestUrl and name.
   */

  DeviceCapabilityManager.get('hardware.memory').then((memOnDevice) => {
    let defaultOrder = order || (memOnDevice <= 256 ? defaultLowMemoryAppsOrder :
      defaultAppsOrder);

    try {
      // Use v2 format when it exists
      const savedOrderV2 = JSON.parse(localStorage.getItem(v2FormatKey));
      if (Array.isArray(savedOrderV2)) {
        inMemoryOrder = savedOrderV2;
        return;
      }

      // Upgrade to v2 format when only v1 format exists
      const savedOrderV1 = JSON.parse(localStorage.getItem(v1FormatKey));
      if (Array.isArray(savedOrderV1)) {
        inMemoryOrder = savedOrderV1.map(upgradeV1FormatIntoV2);
        saveAppsOrder(inMemoryOrder);
        localStorage.removeItem(v1FormatKey);
        return;
      }
      // When neither v2 nor v1 format exists, fallbacks to the default.
      inMemoryOrder = defaultOrder;
    } catch (err) {
      inMemoryOrder = defaultOrder;
    }
    callback && callback();
  });
}

export function updateFixAppsOrder(apps) {
  for (let i = 0; i < defaultFixPositionApps.length; i++) {
    const index = apps.findIndex((item) => testingFunc(item, defaultFixPositionApps[i]));
    if (index !== -1) {
      const app = apps.splice(index, 1)[0];
      apps.splice(defaultFixPositionApps[i].fixPosition, 0, app);
    }
  }
  return apps;
}

export function upgradeV1FormatIntoV2(elem) {
  if ('string' === typeof elem) {
    return {
      name: elem
    };
  }
  return elem;
}

export function saveAppsOrder(appsOrder) {
  // Update the in-memory app order for rendering.
  inMemoryOrder = appsOrder;
  utils.setLocalStorage(v2FormatKey, JSON.stringify(appsOrder));
}

export function removeItemFromAppsOrder(manifestUrl) {
  if (inMemoryOrder && inMemoryOrder.length > 0) {
    const matchedIndex = inMemoryOrder.findIndex(
      (order) => order.manifestUrl === manifestUrl
    );
    if (matchedIndex >= 0) {
      inMemoryOrder.splice(matchedIndex, 1);
      saveAppsOrder(inMemoryOrder);
    }
  }
}

/**
 * Find an item's index via given properties by following order:
 * 1. manifestUrl
 * 2. origin
 */
const testingFunc = (item, query) => {
  return (
    (query.manifestUrl && matcher.hasManifestURL(item, query.manifestUrl)) ||
    (query.origin && matcher.hasOrigin(item, query.origin)) ||
    (query.name && query.name === item.manifest.name)
  );
};

/**
 * The function that iterates over all of the items,
 * and see if any requirement needs to update the apps-order.
 *
 * This should be the only place that modifies the apps-order before rendering.
 */
export function calcAppsOrder(item) {
  // The following rule is only used for customization items,
  // to determine if the suggested position from customization settings
  // should be taken into account or not.
  if ((Customization.isCustomizedItem(item)) &&
    parseInt(item.position, 10) >= 0 &&
    -1 === inMemoryOrder.findIndex((query) => testingFunc(item, query))) {
    inMemoryOrder.splice(+item.position, 0, {
      name: item.name,
      origin: item.origin || null,
      manifestUrl: item.manifestUrl
    });
  }
  return item;
}

/**
 * The function that iterates and attaches the `order` property onto items.
 *
 * WARNING: Do not modify apps-order within this callback function,
 * otherwise we will have unexpected sorting results.
 */
export function applyAppsOrder(item) {
  const matchedIndex =
    inMemoryOrder.findIndex((query) => testingFunc(item, query));
  item.order = (matchedIndex >= 0) ? matchedIndex : 99;
  // STK app name needs to be changed according to sim card.
  if (testingFunc(item, stkApp) && AppStore.stkName) {
    item.displayName = AppStore.stkName;
  }
  return item;
}

export function clear() {
  inMemoryOrder = null;
}
