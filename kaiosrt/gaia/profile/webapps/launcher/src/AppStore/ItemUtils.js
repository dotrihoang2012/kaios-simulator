import MD5 from 'md5.js';
import ItemType from './ItemType';

export const matcher = {
  hasManifestURL: (item, manifestUrl) => (
    item.manifestUrl === manifestUrl
  ),
  hasOrigin: (item, origin) => (
    (item.origin && item.origin === origin) ||
    (item.manifest && item.manifest.origin === origin)
  )
};

export function generateFolderManifestURL(inputString = '') {
  const launcherOrigin = window.location.origin;
  const folderHash = new MD5().update(inputString).digest('hex');
  return `${launcherOrigin}/folder/${folderHash}`;
}

export function getAllFolders(items) {
  throwErrorIfItemsNotGiven(items);
  return items.filter((item) => item.type === ItemType.Folder);
}

export function findFolderByManifestURL(items, manifestUrl) {
  throwErrorIfItemsNotGiven(items);
  return getAllFolders(items)
    .find((folder) => matcher.hasManifestURL(folder, manifestUrl));
}

export function findFoldersByItemManifestURL(items, itemManifestURL) {
  throwErrorIfItemsNotGiven(items);
  return getAllFolders(items)
    .filter((folder) =>
      folder.items &&
      folder.items.find(
        (itemInFolder) => matcher.hasManifestURL(
          itemInFolder,
          itemManifestURL
        )
      )
    );
}

export function findFoldersByItemOrigin(items, origin) {
  throwErrorIfItemsNotGiven(items);
  return getAllFolders(items)
    .filter((folder) =>
      folder.items &&
      folder.items.find(
        (itemInFolder) => matcher.hasOrigin(
          itemInFolder,
          origin
        )
      )
    );
}

/**
 * Find an item by given properties in order of:
 * 1. manifestUrl
 * 2. origin
 *   > Only pick up the 1st item from all matches.
 */
export function findItemByProps(items, props) {
  throwErrorIfItemsNotGiven(items);
  if (!props) {
    throw new Error('Properties for query is required.');
  }
  return (
    (props.manifestUrl && findItemByManifestURL(items, props.manifestUrl)) ||
    (props.origin && findItemsByOrigin(items, props.origin).shift())
  );
}

export function findItemByManifestURL(items, url) {
  throwErrorIfItemsNotGiven(items);
  return items.find((item) => matcher.hasManifestURL(item, url));
}

export function findItemByOrigin(items, url) {
  throwErrorIfItemsNotGiven(items);
  return items.find((item) => matcher.hasOrigin(item, url));
}

export function findItemIndexByManifestURL(items, url) {
  throwErrorIfItemsNotGiven(items);
  return items.findIndex((item) => matcher.hasManifestURL(item, url));
}

export function findItemsByOrigin(items, origin) {
  throwErrorIfItemsNotGiven(items);
  return items.filter((item) => matcher.hasOrigin(item, origin));
}

export function findFolderByName(items, name) {
  throwErrorIfItemsNotGiven(items);
  let findIndex;
  items.find((item, index) => {
    if (item.name === name && item.source === 'localfolder') {
      findIndex = index;
      return true;
    }
    return false;
  });
  return findIndex;
}

function throwErrorIfItemsNotGiven(items) {
  if (!Array.isArray(items)) {
    throw new Error('The source items is required.');
  }
}
