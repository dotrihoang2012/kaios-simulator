/* global Toaster */
import Service from 'service';
import ManifestHelper from '../manifest_helper';
import ItemType from './ItemType';
import { generateFolderManifestURL } from './ItemUtils';
import AppNotices from '../AppNotice';
import launchStore from '../util/launch_store';
import { sendActivity } from '../util/utils';

/**
 * Create an item for the AppStore
 */
export function create(itemType, options) {
  switch (itemType) {
    case ItemType.App: {
      const { app } = options;
      if (!app) {
        throw new Error('Failed to create the app item, app reference is required.');
      }
      return createAppItemList(app);
    }
    case ItemType.Bookmark: {
      const { bookmark } = options;
      if (!bookmark) {
        throw new Error('Failed to create the bookmark item, bookmark metadata is required.');
      }
      return [
        createBookmarkItem(bookmark)
      ];
    }
    case ItemType.Folder: {
      const { folder } = options;
      if (!folder) {
        throw new Error('Failed to create the folder item, folder metadata is required.');
      }
      return [
        createFolderItem(folder)
      ];
    }
    case ItemType.Virtual: {
      const { virtual } = options;
      if (!virtual) {
        throw new Error('Failed to create the customize item, customize metadata is required.');
      }
      return [
        createVirtualItem(virtual)
      ];
    }
    default:
      throw new Error('Fail to create item, itemType is required.');
  }
}

export function createAppItemList(app) {
  const manifest = app.manifest;

  // Delete unused description field to release strings
  delete manifest.description;
  const { locales } = manifest;
  if (locales) {
    for (let locale in locales) {
      if ({}.hasOwnProperty.call(locales, locale)) {
        delete locales[locale].description;
      }
    }
  }

  const item = {};
  for (const key in app) {
    item[key] = app[key];
  }

  item.type = ItemType.App;
  item.uid = item.manifestUrl;
  item.displayName = new ManifestHelper(manifest).displayName;
  const focusColor = manifest.b2g_features && manifest.b2g_features.focus_color;
  item.theme = {
    color: focusColor || manifest.theme_color
  };

  return [item];
}
export function createBookmarkItem(bookmark) {
  if (!bookmark.url) {
    return null;
  }
  return {
    type: ItemType.Bookmark,
    displayName: bookmark.name,
    enabled: true,
    removable: true,
    manifestUrl: bookmark.url,
    url: bookmark.url,
    favicon: bookmark.icon,
    manifest: {
      name: bookmark.url
    },
    uid: bookmark.url,
    theme: {
      color: '#20AFCC'
    }
  };
}
export function createFolderItem(folder) {
  const manifestUrl = generateFolderManifestURL(JSON.stringify(folder));
  const folderName = (
    folder.name ||
    (folder.manifest && folder.manifest.name) ||
    'Untitled Folder'
  );
  return {
    ...folder,
    manifestUrl,
    type: ItemType.Folder,
    displayName: folderName,
    // The folder item is not removable for now.
    removable: false,
    manifest: {
      // Give the default manifest name,
      // then overwrite it when is provided.
      name: folderName,
      ...folder.manifest
    },
    // Fallback items to empty array
    items: folder.items || [],
    // Set to true if we need to make collected apps visible to AllApps screen.
    showItemsInAllApps: false
  };
}
export function createVirtualItem(virtual) {
  return {
    type: ItemType.Virtual,
    displayName: virtual.name,
    enabled: true,
    removable: false,
    manifestUrl: virtual.url,
    url: virtual.url,
    manifest: {
      name: virtual.name,
      ...virtual.manifest
    },
    uid: virtual.url
  };
}

export function launchBrowser(url) {
  let options = {
    name: 'view',
    data: {
      url,
      type: 'url'
    }
  };

  const activity = sendActivity(options);
  activity.catch(() => {
    console.error('launchBrowser activity error');
  });
}

/**
 * Launch the target item.
 */
export function launch(item) {
  window.performance.mark(`appLaunch@${item.origin}`);
  DUMP('Launch app = ' + ItemType.App);
  switch (item.type) {
    case ItemType.App:
      if (!item.items) {
        AppNotices.clearAppStatus(item);
      }
      if (item.role && item.role === 'invalid') {
        Toaster.showToast({
          messageL10nId: 'toast-need-update-app'
        });
        return;
      }
      window.open(item.manifestUrl, '_blank', 'kind=app,noopener=yes');
      break;
    case ItemType.Bookmark:
      launchBrowser(item.url);
      break;
    case ItemType.Folder:
      Service.request('openSheet', ['folder', item.manifestUrl]);
      Service.request('resetLaunchingMarker');
      break;
    case ItemType.Virtual:
      if (window.AppOrigin.getManifestURL('search') === item.manifestUrl) {
        window.open(item.manifestUrl, '_blank', 'kind=app,noopener=yes');
      } else if ('homescreen.search' === item.url) {
        SettingsObserver.getValue('google.client_id')
          .then((clientId = 'kaios') => {
            const startUrl = (
              item.manifest &&
              item.manifest.start_url
            )
              ? item.manifest.start_url.replace('%CLIENT_ID%', clientId)
              : null;
            launchBrowser(startUrl);
          });
      } else if ('homescreen.youtube' === item.url) {
        const startUrl = item.manifest && item.manifest.start_url;
        launchBrowser(startUrl);
      } else {
        launchStore.launchVirtualApp(item);
      }
      break;
    default:
      console.error(`Failed to launch an unexpected type item: ${item.type}`);
      break;
  }
}
