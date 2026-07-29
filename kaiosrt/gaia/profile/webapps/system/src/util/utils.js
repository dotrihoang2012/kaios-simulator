export function toL10n(id = '', args = {}, idNeeded = true) {
  if ('complete' !== window.api.l10n.readyState || !id) {
    return id;
  }
  id += '';
  return window.api.l10n.get(id, args) || (idNeeded ? id : '');
}

export function simpleClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// === Math.min(max, Math.max(min, num))
export function clamp(num, min = 0, max = 2) {
  return (num <= min) ? min : ((num >= max) ? max : num);
}

export function rowColToIndex(rc = [0, 0], col = 3, sum = 7) {
  if (sum === 7) {
    return (rc[0] * col) + rc[1];
  } else if (rc[0] === 2) { // 6, 5
    return sum - 1;
  } else {
    const index = (rc[0] * col) + rc[1];
    if (index >= sum - 1 && rc[0] !== 2) {
      return sum - 2;
    } else {
      return index;
    }
  }
}

export function indexToRowCol(index, col = 3, sum = 7) {
  if (index === sum - 1) {
    return [2, 0];
  } else {
    return [Math.floor(index / col), index % col];
  }
}

// In simulator document.body.clientHeigh is 0 at this time.
export const isLandscape = document.body.clientHeight &&
  document.body.clientWidth > document.body.clientHeight;

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

export function ellipsisTextContent(e) {
  if (e.offsetHeight < e.scrollHeight) {
    let ellip = window.api.l10n.get('ellipses_char');
    let backupString = e.textContent.substring();
    let minLength = 0;
    let maxLength = 0;
    let mid = 0;
    let maxSearchRange = 255;

    e.textContent = backupString.substring(0,
        e.textContent.length * e.offsetHeight / e.scrollHeight) + ellip;
    if (e.offsetHeight < e.scrollHeight) {
      maxLength = e.textContent.length - ellip.length;
      minLength = Math.max(0, maxLength - maxSearchRange);
    } else {
      minLength = e.textContent.length - ellip.length;
      maxLength = Math.min(backupString.length, minLength + maxSearchRange);
    }
    mid = parseInt((minLength + maxLength) / 2);
    // keep maxLength always don't fit
    while (minLength + 1 < maxLength) {
      mid = parseInt((minLength + maxLength) / 2);
      e.textContent = backupString.substring(0, mid) + ellip;
      if (e.offsetHeight < e.scrollHeight) {
        maxLength = mid;
      } else {
        minLength = mid;
      }
    }
    if (minLength !== mid) {
      e.textContent = backupString.substring(0, minLength) + ellip;
    }
  }
}

export function toggleBluetooth(targetState) {
  if (!navigator.b2g.bluetooth ||
      !navigator.b2g.bluetooth.defaultAdapter ||
      !navigator.b2g.bluetooth.defaultAdapter.state) {
    return Promise.reject('no bluetooth exist');
  }

  let currentState = navigator.b2g.bluetooth.defaultAdapter.state;
  let isEnabled = ('enabled' === currentState);
  targetState = targetState || (isEnabled ? 'disable' : 'enable');

  if (currentState.endsWith('ing')) {
    return Promise.reject(`bluetooth state is busy: ${currentState}`);
  }
  return navigator.b2g.bluetooth.defaultAdapter[targetState]();
}

export function timeFormatter_format2(timestamp) {
  const _ = window.api.l10n.get;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMidnight = today.getTime();
  const yesterdayMidnight = todayMidnight - 86400 * 1000;
  const thisyearTimestamp = (new Date(today.getFullYear().toString())).getTime();
  const hour12 = window.api.hour12;
  const interval = (Date.now() - timestamp) / 1000;
  let formatString = '';
  let dateFormatString = '';
  let section = '';
  if (interval < 0) {
    section = 'others';
  } else if (interval <= 14400) { // within 4 hours
    if (timestamp > todayMidnight) { // today
      if (interval < 3600) { // within 1 hour
        formatString =
          _('minutes-ago-long', { value: Math.floor(interval / 60) });
      } else {
        formatString =
          _('hours-ago-long', { value: Math.floor(interval / 3600) });
      }
    } else if (timestamp > thisyearTimestamp) { // yesterday
      formatString = _('days-ago-long', {
        value: 1
      });
      section = 'inTwoDays';
    } else { // last year
      section = 'inTwoDaysLastYear';
    }
  } else if (timestamp > yesterdayMidnight) { // today or yesterday
    formatString = _('days-ago-long', {
      value: timestamp > todayMidnight ? 0 : 1
    });
    section = 'inTwoDays';
  } else if (todayMidnight - timestamp < 518400000) { // whithin one week
    section = 'inOneWeek';
  } else if (timestamp > thisyearTimestamp) {
    section = 'thisYear';
  } else {
    section = 'others';
  }

  const options = {
    'inTwoDaysLastYear': {
      hour12,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    },
    'inTwoDays': {
      hour12,
      hour: 'numeric',
      minute: 'numeric'
    },
    'inOneWeek': {
      hour12,
      weekday: 'long',
      hour: 'numeric',
      minute: 'numeric'
    },
    'thisYear': {
      hour12,
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    },
    'others': {
      hour12,
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }
  };
  if (section) {
    dateFormatString =
      new Date(timestamp).toLocaleString(navigator.language, options[section]);
  }
  if (formatString && section) {
    dateFormatString = _('dateFormat2', {
      day: formatString,
      timeformat: dateFormatString
    });
  } else if (formatString) {
    dateFormatString = formatString;
  }
  return dateFormatString;
}
