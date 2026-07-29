import ItemType from './ItemType';

const DEFAULT_ICON_SIZE = {
  NORMAL: '56',
  MIDDLE: '84',
  HIGH: '112'
};
const defaultImages = {
  app: {
    56: './style/images/default_app_56.png',
    112: './style/images/default_app_112.png'
  },
  web_shortcut: {
    56: './style/images/web_shortcut_56.png',
    112: './style/images/web_shortcut_112.png'
  },
  favicon: {
    48: './style/images/default_favicon_48.png'
  }
};


export function mountItemIcon(item, onUpdateCallback) {
  switch (item.type) {
    default:
    case ItemType.Folder:
    case ItemType.Virtual: {
      const iconList = item.manifest.icons;
      item.icon_url = iconList[DEFAULT_ICON_SIZE.NORMAL];
      item.icon_url_hq = iconList[DEFAULT_ICON_SIZE.HIGH];
      onUpdateCallback();
      break;
    }
    case ItemType.App: {
      // Try to get and update the icon.
      const iconList = item.manifest.icons;
      if (iconList && iconList.length) {
        const origin = item.origin;

        // Try to load regular-size icon for the app.
        getIconUrl(iconList, {
          origin,
          preferredSize: DEFAULT_ICON_SIZE.NORMAL
        })
          .then((imageUrl) => {
            item.icon_url = imageUrl;
          })
          .catch((err) => {
            console.warn(`Failed to load the icon for ${item.manifest.name}, reason: ${err}`);
            // Fallback to high-res icon if available.
            // Otherwise, fallback to the default icon.
            if (item.icon_url_hq && item.icon_url_hq !==
              defaultImages.app[DEFAULT_ICON_SIZE.HIGH]) {
              item.icon_url = item.icon_url_hq;
            } else {
              item.icon_url = defaultImages.app[DEFAULT_ICON_SIZE.NORMAL];
            }
          })
          .then(() => onUpdateCallback && onUpdateCallback());

        // Try to load highres-size icon for the app.
        getIconUrl(iconList, {
          origin,
          preferredSize: DEFAULT_ICON_SIZE.HIGH
        })
          .then((imageUrl) => {
            item.icon_url_hq = imageUrl;
          })
          .catch((err) => {
            console.warn(`Failed to load the high-res icon for ${item.manifest.name}, reason: ${err}`);
            // Fallback to regular icon if available.
            // Otherwise, fallback to the default icon.
            if (item.icon_url && item.icon_url !== defaultImages.app[DEFAULT_ICON_SIZE.NORMAL]) {
              item.icon_url_hq = item.icon_url;
            } else {
              item.icon_url_hq = defaultImages.app[DEFAULT_ICON_SIZE.HIGH];
            }
          })
          .then(() => onUpdateCallback && onUpdateCallback());
      } else {
        // The app doesn't provide any icons,
        // fallback to default icons.

        item.icon_url = defaultImages.app[DEFAULT_ICON_SIZE.NORMAL];
        item.icon_url_hq = defaultImages.app[DEFAULT_ICON_SIZE.HIGH];

        if (onUpdateCallback) {
          onUpdateCallback();
        }
      }
      break;
    }
    case ItemType.Bookmark: {
      item.icon_url = defaultImages.web_shortcut['56'];
      item.icon_url_hq = defaultImages.web_shortcut['112'];
      item.favicon_url = defaultImages.favicon['48'];
      if (onUpdateCallback) {
        onUpdateCallback();
      }

      testImageAvailability(item.favicon)
        .then((imageUrl) => {
          item.favicon_url = imageUrl;
          if (onUpdateCallback) {
            onUpdateCallback();
          }
        })
        .catch((err) => {
          console.warn(`Failed to load the favicon: ${item.favicon}, reason: ${err}`);
        });
      break;
    }
  }
}

export function getIconUrl(iconList, options = { preferredSize: DEFAULT_ICON_SIZE.NORMAL }) {
  if (!iconList) {
    return Promise.reject(null);
  }
  return new Promise((resolve, reject) => {
    const { origin, preferredSize } = options;
    const iconItem = findIconItem(iconList, preferredSize);
    const iconUrl = iconItem && iconItem.src;
    if (!iconUrl) {
      resolve(defaultImages.app[preferredSize]);
      return;
    }

    const isRemoteImage = () => /^https?:\/\//i.test(iconUrl);
    const isDataURI = () => /^data:/i.test(iconUrl);

    testImageAvailability(
      isDataURI() || isRemoteImage() ?
        iconUrl :
        `${origin}${transformIconUrl(iconUrl)}`
    )
      .then((imageUrl) => resolve(imageUrl))
      .catch((err) => reject(err));
  });
}

export function findIconItem(iconList, preferredSize = DEFAULT_ICON_SIZE.NORMAL) {
  const preferIcon = iconList.find((item) =>
    item.sizes === `${preferredSize}x${preferredSize}`);
  if (preferIcon) return preferIcon;
  const specialIcon = iconList.find((item) =>
    item.sizes === `${DEFAULT_ICON_SIZE.MIDDLE}x${DEFAULT_ICON_SIZE.MIDDLE}`);
  if (specialIcon) return specialIcon;

  if (preferredSize === DEFAULT_ICON_SIZE.NORMAL) {
    return iconList.shift();
  } else if (preferredSize === DEFAULT_ICON_SIZE.HIGH) {
    return iconList.pop();
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
