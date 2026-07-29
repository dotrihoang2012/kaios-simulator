import { LOW_STORAGE, BATTERY_LIMIT, DEFAULT_ICON_SIZE } from './constant';

export const getSimInfo = () => {
  const simInfo = {
    icc_mcc: 0,
    icc_mnc: 0,
    icc_mcc2: 0,
    icc_mnc2: 0,
  };

  const { iccId } = navigator.b2g.mobileConnections[0];
  if (iccId !== null) {
    const { iccInfo } = navigator.b2g.iccManager.getIccById(iccId);
    if (iccInfo) {
      simInfo.icc_mcc = parseInt(iccInfo.mcc, 10) || 0;
      simInfo.icc_mnc = parseInt(iccInfo.mnc, 10) || 0;
    }
  }

  if (navigator.b2g.mobileConnections.length > 1) {
    const iccId2 = navigator.b2g.mobileConnections[1].iccId;
    if (iccId2 !== null) {
      const iccInfo2 = navigator.b2g.iccManager.getIccById(iccId2).iccInfo;
      if (iccInfo2) {
        simInfo.icc_mcc2 = parseInt(iccInfo2.mcc, 10) || 0;
        simInfo.icc_mnc2 = parseInt(iccInfo2.mnc, 10) || 0;
      }
    }
  }

  return simInfo;
}

/**
 * Check WiFi connection status by navigator.mozWifiManager.
 * @returns {boolean}
 */
export const isWifiConnected = () => {
  const { wifiManager } = navigator.b2g;

  return wifiManager && wifiManager.hasInternet;
};

/**
 * Check data connection status by navigator.mozMobileConnections.
 * since navigator.mozMobileConnections is Array-Like Objects,
 * so we need use Array.prototype to access the .find() method.
 * @returns {boolean}
 */
export const isDataConnected = () => {
  const conns = navigator.b2g.mobileConnections || [];
  const dataConnected = Array.prototype.find.call(conns, (conn) => {
    return conn.iccId && conn.data && conn.data.connected;
  });

  return !!dataConnected;
};

/**
 * Make sure have Internet connection.
 * @returns {boolean}
 */
export const isNetworkConnected = () => {
  return isDataConnected() || isWifiConnected();
};

/**
 * Takes 2 numbers and returns retry interval array.
 * @returns {array}
 */
export const getRetryInterval = (length, start = 0) => {
  let fibonacci = [];

  fibonacci[0] = 0;
  fibonacci[1] = 1;

  for (let i = 2; i < length; i++) {
    fibonacci[i] = fibonacci[i - 1] + fibonacci[i - 2];
  }

  return fibonacci.slice(start);
};

export const checkIsLowStorage = () => {
  return new Promise((resolve, reject) => {
    const appStorage = navigator.b2g.getDeviceStorage('apps');
    if (appStorage) {
      appStorage
        .freeSpace()
        .then((result) => {
          resolve(result < LOW_STORAGE);
        })
        .catch((err) => {
          console.warn('[app_store] FAIL TO GET FREE SPACE', err);
          reject(err);
        });
    } else {
      console.warn('[app_store] Get APPS STORAGE FAIL');
      reject();
    }
  });
};

export const isLowBattery = () => {
  return (
    navigator.battery &&
    navigator.battery.level <= BATTERY_LIMIT &&
    !navigator.battery.charging
  );
};

export const isPackagedApp = (mozApp) => {
  if (!mozApp.manifest) return false;

  const { type } = mozApp.manifest;

  return type === 'privileged' || type === 'certified';
};

export function sortIconList(iconList) {
  let sortedIconList = iconList.slice();
  const pattern = /\D/g;

  try {
    sortedIconList = sortedIconList.sort((a, b) => {
      return a.sizes.replace(pattern, '') - b.sizes.replace(pattern, '');
    });
  } catch (error) {
    console.warn('Failed to sort icon list', error);
  }

  return sortedIconList;
}

export function findIconItem(
  iconList,
  preferredSize = DEFAULT_ICON_SIZE.NORMAL
) {
  const preferIcon = iconList.find(
    (item) => item.sizes === `${preferredSize}x${preferredSize}`
  );
  if (preferIcon) return preferIcon;
  const specialIcon = iconList.find(
    (item) =>
      item.sizes === `${DEFAULT_ICON_SIZE.MIDDLE}x${DEFAULT_ICON_SIZE.MIDDLE}`
  );
  if (specialIcon) return specialIcon;

  const sortedIconList = sortIconList(iconList);

  if (preferredSize === DEFAULT_ICON_SIZE.NORMAL) {
    return sortedIconList.shift();
  } else if (preferredSize === DEFAULT_ICON_SIZE.LARGE) {
    return sortedIconList.pop();
  }
}

export function testImageAvailability(imageUrl) {
  return new Promise((resolve, reject) => {
    let img = new Image();
    img.onload = () => {
      img = null;
      resolve(imageUrl);
    };
    img.onerror = () => {
      img = null;
      reject('The image is not accessible.');
    };
    img.src = imageUrl;
  });
}

export function transformIconUrl(url) {
  if (url.indexOf('/') === 0) {
    return url;
  }
  return `/${url}`;
}

export const getIconUrl = (iconList, options) => {
  if (!iconList) {
    return Promise.reject(null);
  }
  return new Promise((resolve, reject) => {
    const { origin, preferredSize } = options;
    const iconItem = findIconItem(iconList, preferredSize);
    const iconUrl = iconItem && iconItem.src;

    if (!iconUrl) {
      return;
    }

    const isRemoteImage = () => /^https?:\/\//i.test(iconUrl);
    const isDataURI = () => /^data:/i.test(iconUrl);

    testImageAvailability(
      isDataURI() || isRemoteImage()
        ? iconUrl
        : `${origin}${transformIconUrl(iconUrl)}`
    )
      .then((imageUrl) => {
        resolve(imageUrl);
      })
      .catch((err) => {
        reject(err);
      });
  });
};


