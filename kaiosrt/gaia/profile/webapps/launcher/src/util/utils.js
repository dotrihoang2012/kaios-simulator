/* global Toaster */
import ContactPhotoHelper from 'contact_photo_helper';

export function toL10n(id = '', args = {}) {
  if ('complete' !== window.api.l10n.readyState || !id) {
    return id;
  }
  id += '';
  return window.api.l10n.get(id, args) || id;
}

export function sendNumberToContact({ name = 'new', telNum = '' } = {}) {
  sendActivity({
    name,
    data: {
      type: 'webcontacts/contact',
      params: {
        tel: telNum
      },
      caller: 'Launcher'
    }
  });
}

export function getDeepProp(obj, deepProp, splitChar = '.') {
  return deepProp.split(splitChar).reduce((_obj, _deepProp) => _obj && _obj[_deepProp], obj);
}

export function pickContact(cb) {
  let activity = sendActivity({
    name: 'pick',
    data: { type: 'webcontacts/tel', params: { typeOfContact: 'device' } }
  })
  .then(cb)
  .catch(() => console.warn('Activity error', activity.error.name));
}

export function simpleClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// === Math.min(max, Math.max(min, num))
export function clamp(num, min = 0, max = 2) {
  return (num <= min) ? min : ((num >= max) ? max : num);
}

export function rowColToIndex(rc = [0, 0], col = 3) {
  return (rc[0] * col) + rc[1];
}

export function indexToRowCol(index, col = 3) {
  return [Math.floor(index / col), index % col];
}

export const isLandscape = (window.innerWidth > window.innerHeight);

export function isRtl() {
  return 'rtl' === document.dir;
}

export function navGrid({ currentRowCol = [0, 0], dir, col = 3, total } = {}) {
  let currentIndex = rowColToIndex(currentRowCol, col);
  let totalRows = Math.ceil(total / col);
  let totalGrid = totalRows * col;
  let lastIndex = total - 1;

  switch (dir) {
    case 'ArrowRight':
      currentIndex = (total + (currentIndex + 1)) % total;
      break;
    case 'ArrowLeft':
      currentIndex = (total + (currentIndex - 1)) % total;
      break;
    case 'ArrowUp':
      currentIndex = clamp((totalGrid + (currentIndex - col)) % totalGrid, 0, lastIndex);
      break;
    case 'ArrowDown':
      currentIndex = clamp((totalGrid + (currentIndex + col)) % totalGrid, 0, lastIndex);
      break;
    default:
      break;
  }

  return indexToRowCol(currentIndex, col);
}

export function contactNumFilter({ telNum } = {}) {
  let contactsResult = [];
  return new Promise((res, rej) => {
    ContactsManager.find({
      filterBy: [ContactsManager.FilterByOption.TEL],
      filterOption: ContactsManager.FilterOption.CONTAINS,
      filterValue: telNum,
      onlyMainData: true
    }, 5)
    .then((cursor) => {
      const fetchData = () => {
        cursor.next()
          .then((contacts) => {
            contactsResult = contactsResult.concat(contacts);
            fetchData();
          })
          .catch((error) => {
            cursor.release();
            res(contactsResult);
            console.error('traverse error:', error);
          });
      };
      fetchData();
    })
    .catch((error) => {
      console.error('Find contacts error: ' + error);
      rej();
    });
  });
}

// We will apply createObjectURL for details.photoURL if contact image exist
// Please remember to revoke the photoURL after utilizing it.
export function getContactDetails(number, contacts, include) {
  let details = {};

  include = include || {};

  function updateDetails(contact) {
    let name;
    let phone;
    let i;
    let length;
    let subscriber;
    let org;
    name = contact.name[0];
    org = contact.org && contact.org[0];
    length = contact.tel ? contact.tel.length : 0;
    subscriber = number.length > 7 ? number.substr(-8) : number;

    // Check which of the contacts phone number are we using
    for (i = 0; i < length; i++) {
      // Based on E.164 (http://en.wikipedia.org/wiki/E.164)
      if (contact.tel[i].value.indexOf(subscriber) !== -1) {
        // phone = contact.tel[i];
        break;
      }
    }

    // Add data values for contact activity interaction
    details.isContact = true;

    // Add photo
    if (include.photoURL) {
      let photo = ContactPhotoHelper.getThumbnail(contact);
      if (photo) {
        details.photoURL = window.URL.createObjectURL(photo);
      }
    }

    details.name = name;
    details.phone = phone;
    // We pick the first discovered org name as the phone number's detail
    // org information.
    details.org = details.org || org;
  }

  // In no contact or contact with empty information cases, we will leave
  // the title as the empty string and let caller to decide the title.
  if (!contacts || (Array.isArray(contacts) && 0 === contacts.length)) {
    details.title = '';
  } else if (!Array.isArray(contacts)) {
    updateDetails(contacts);
    details.title = details.name || details.org;
  } else {
    // Rule for fetching details with multiple contact entries:
    // 1) If we got more than 1 contact entry, find another entry if
    //    current entry got no name/company.
    // 2) If we could not get any information from all the entries,
    //    just display phone number.
    for (let i = 0, l = contacts.length; i < l; i++) {
      updateDetails(contacts[i]);
      if (details.name) {
        break;
      }
    }
    details.title = details.name || details.org;
  }

  return details;
}

export const asyncLocalStorage = {
  setItem: (key, value) => {
    return Promise.resolve().then(() => {
      try {
        localStorage.setItem(key, value);
      } catch (err) {
        console.error(`Set asyncLocalStorage err: ${err}`);
      }
    });
  },
  getItem: (key) => {
    return Promise.resolve().then(() => {
      return localStorage.getItem(key);
    });
  }
};

export function flat(targetArray) {
  return [].concat(...targetArray);
}

export function insertBetween(targetArray, insertElem) {
  return flat(targetArray.map((elem) => [insertElem, elem])).slice(1);
}

export function showToast(l10nId, argus) {
  Toaster.showToast({
    messageL10nId: l10nId,
    messageL10nArgs: argus
  });
}

export function setLocalStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.error('Set localStorage error!', err);
  }
}

export function customEvtentKey(key, options, LaunchStore) {
  if (!options) return;
  const customItem = options.find((item) => item.key === key);
  if (customItem) {
    LaunchStore.launch(customItem.type, customItem.url);
    return true;
  }
  return false;
}

export function sendActivity(activityData) {
  return new WebActivity(
    ...[activityData.name, activityData.data].filter(Boolean)
  ).start();
}
