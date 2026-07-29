/* global AppStore */
import {
  findFoldersByItemOrigin,
  findFoldersByItemManifestURL } from '../AppStore/ItemUtils';

/**
 * Item will be invisible if it's one of the following roles.
 */
const internalAppRoles = [
  'system',
  'input',
  'theme',
  'homescreen',
  'invisible',
  'carrier'
];

/**
 * Functions that evaluates each factor of item's visibility.
 */
// const isEnabled = (item) => item.enabled && item.role !== 'invisible';
const isDialerApp = (item) => 'dialer' === item.entry;
const isInternalApps = (item) => internalAppRoles.includes(item.manifest.role);
const isStkApp = (item) => ('stk' === item.name);
const isStkEnabled = () => AppStore.flags.stkEnabled;
const isAirplaneModeEnabled = () => AppStore.flags.airplaneModeEnabled;
const isOnlyVisibleInFolder = (folders) => {
  const hasAnyFolderAskedToShowItems =
    folders.filter((folder) => folder.showItemsInAllApps).length > 0;
  return !hasAnyFolderAskedToShowItems;
};
const isInSidemenu = (item) => item.isInSidemenu;

/**
 * The centralized evaluating function for item's visibility in AllApps screen.
 */
export default function shouldHide(item) {
  if (
    // !isEnabled(item) ||
    isInternalApps(item) ||
    isInSidemenu(item) ||
    isDialerApp(item)) {
    return true;
  }

  if (isStkApp(item)) {
    const isStkAvailable = isStkEnabled() && !isAirplaneModeEnabled();
    return !isStkAvailable;
  }

  const foldersContainManifest =
    findFoldersByItemManifestURL(AppStore.apps, item.manifestUrl);
  const foldersContainOrigin =
    findFoldersByItemOrigin(AppStore.apps, item.origin);
  const isInFolder = foldersContainManifest.length > 0 || foldersContainOrigin.length > 0;
  if (isInFolder) {
    return isOnlyVisibleInFolder(
      foldersContainManifest.length > 0 ? foldersContainManifest : foldersContainOrigin
    );
  }

  // Add new requirements here.

  return false;
}
