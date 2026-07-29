
/* global DownloadFormatter, DownloadApiManager */
/**
 * Download Item helper.
 * Creates and updates the DOM needed to render a download as a list item.
 *
 * Usage:
 *   var li = DownloadItem.create(download);
 *
 * Once you got the reference, you can attach event listeners or update the
 * content explicitely if you know the download has been modified:
 *   DownloadItem.update(li, download);
 *
 * This helper requires some l10n resources, make sure to import them:
 *   <link rel="localization"
 *         href="../shared/locales/download/download.{locale}.properties">
 */
// eslint-disable-next-line
const DownloadItem = (function DownloadItem() {
  /*
   * Generates the following DOM, take into account that
   * the css needed for the classes above is in settings app:
   * downloads.css
   * @param {DomDownload} Download object to get the output from
   *
   *<li data-url="{url}" data-state="{download.state}">
   *  <aside class="download-status">
   *  </aside>
   *  <aside class="pack-end"
   *      data-id="{download.id}">
   *  </aside>
   *  <p class="fileName">Filename.doc</p>
   *  <p class="info">57% - 4.1MB of 7MB</p>
   *  <progress value="57" max="100"></progress>
   *</li>
   */
  const create = function create(download) {
    // eslint-disable-next-line
    const id = getDownloadId(download);
    const li = document.createElement('li');
    li.classList.add('auto-height');
    li.dataset.url = download.url;
    // eslint-disable-next-line
    li.dataset.state = getDownloadState(download);
    li.id = id;
    li.dataset.id = id;
    li.classList.add('list-item');
    li.setAttribute('role', 'menuitem');

    const label = document.createElement('label');
    label.classList.add('pack-checkbox');
    const checkBox = document.createElement('input');
    checkBox.setAttribute('type', 'checkbox');
    // eslint-disable-next-line
    checkBox.value = getDownloadId(download);

    const span = document.createElement('span');

    label.appendChild(checkBox);
    label.appendChild(span);

    const asideStatus = document.createElement('aside');
    asideStatus.className = 'download-status';
    const asideAction = document.createElement('aside');
    asideAction.dataset.id = id;

    const pFileName = document.createElement('span');
    pFileName.classList.add('fileName');
    pFileName.classList.add('long-string');
    const fileName = DownloadFormatter.getFileName(download);
    // eslint-disable-next-line
    const parsedFile = parseFileName(fileName);
    const pParseFileName = document.createElement('p');
    const pParseFileExt = document.createElement('p');
    pFileName.dataset.fileName = fileName;
    pParseFileName.classList.add('download-filename');
    pParseFileExt.classList.add('file-ext');
    if (parsedFile.extension.length > 6) {
      pParseFileExt.classList.add('hide');
      parsedFile.name = fileName;
    }
    pParseFileName.textContent = parsedFile.name;
    pParseFileExt.textContent = parsedFile.extension;
    pFileName.appendChild(pParseFileName);
    pFileName.appendChild(pParseFileExt);

    const pSize = document.createElement('p');
    pSize.classList.add('size');
    pSize.setAttribute('dir', 'auto');

    const pSizeContainer = document.createElement('div');
    pSizeContainer.classList.add('sizeContainer');
    pSizeContainer.setAttribute('aria-hidden', true);

    const pPercent = document.createElement('div');
    pPercent.classList.add('percent');

    const pDownloadedSize = document.createElement('div');
    pDownloadedSize.classList.add('downloadedSize');
    pDownloadedSize.setAttribute('dir', 'auto');

    pSizeContainer.appendChild(pPercent);
    pSizeContainer.appendChild(pDownloadedSize);

    const pDate = document.createElement('p');
    pDate.classList.add('date');

    const progress = document.createElement('gaia-progress');
    progress.setAttribute('aria-hidden', true);

    const pTextContainer = document.createElement('div');
    pTextContainer.classList.add('textContainer');

    pTextContainer.appendChild(asideStatus);
    pTextContainer.appendChild(asideAction);
    pTextContainer.appendChild(pFileName);
    pTextContainer.appendChild(pSize);
    pTextContainer.appendChild(pSizeContainer);
    pTextContainer.appendChild(progress);
    pTextContainer.appendChild(pDate);

    li.appendChild(label);
    li.appendChild(pTextContainer);

    // eslint-disable-next-line
    return li;
  };

  const parseFileName = function parseFileName(filename) {
    const file = {};
    const position = filename.lastIndexOf('.');
    const ext = filename.substring(position, filename.length);
    file.extension = ext;
    file.name = filename.substring(0, position);
    return file;
  };

  /*
   * Given a DOM Download Item generated with the previous
   * method, update the style and the content based on the
   * given download.
   * @param {Dom Element} LI element representing the download
   * @param {DomDownload} Download object
   */
  const update = function update(domElement, download, click) {
    // eslint-disable-next-line
    const domNodes = getElements(domElement);
    // Update content
    // eslint-disable-next-line
    updateContent(domElement, domNodes, download, click);

    return domElement;
  };

  const updateContentByState = function updateContentByState(
    domNodes,
    download,
    state
  ) {
    if (state === 'downloading') {
      domNodes.progress.value = DownloadFormatter.getPercentage(download);

      // eslint-disable-next-line
      if (!download.totalBytes) {
        domNodes.sizeContainer.classList.add('hidden');
        domNodes.progress.classList.add('hidden');
        domNodes.size.classList.remove('hidden');

        l10n.setAttributes(domNodes.size, 'downloading-no-total', {
          partial: DownloadFormatter.getDownloadedSize(download)
        });
      } else {
        domNodes.size.classList.add('hidden');
        domNodes.progress.classList.remove('hidden');
        domNodes.sizeContainer.classList.remove('hidden');

        l10n.setAttributes(domNodes.percent, 'display-percent', {
          percent: DownloadFormatter.getPercentage(download)
        });

        l10n.setAttributes(domNodes.downloadedSize, 'partialResult', {
          partial: DownloadFormatter.getDownloadedSize(download),
          total: DownloadFormatter.getTotalSize(download)
        });
      }
    } else {
      const status = '';

      domNodes.progress.classList.add('hidden');
      domNodes.size.textContent = status;
      domNodes.size.classList.remove('hidden');
      domNodes.sizeContainer.classList.add('hidden');
      switch (state) {
        case 'stopped':
        case 'failed':
          l10n.setAttributes(domNodes.size, `download-${state}-item`, {
            partial: DownloadFormatter.getDownloadedSize(download)
          });
          break;
        case 'succeeded':
          domNodes.size.textContent = DownloadFormatter.getTotalSize(download);
          break;
        default:
          break;
      }

      // eslint-disable-next-line
      domNodes.date.textContent = getDate(download);
    }
  };

  /*
   * Update the content of the elements according to the download
   * status
   * @param {Object of DOM Element} Dictionary containing the DOM
   *   elements accesible by name
   * @param {DomDownload} Download object
   */
  const updateContent = function updateContent(
    domElement,
    domNodes,
    download,
    click
  ) {
    let { state } = download;

    if (click) {
      domElement.dataset.state = state;
      updateContentByState(domNodes, download, state);
      return;
    }

    if (download.error) {
      state = 'failed';
    }

    domElement.dataset.state = state;
    updateContentByState(domNodes, download, state);
  };

  const dateFormat = window.api.l10n.DateTimeFormat();

  const getDate = function getDate(download) {
    let date = null;

    try {
      date = new Date(download.startTime);
    } catch (ex) {
      date = new Date();
      console.error(ex);
    }

    // eslint-disable-next-line
    return prettyDate(date);
  };

  // eslint-disable-next-line
  const prettyDate = function prettyDate(timeDate, useCompactFormat, maxDiff) {
    const time = timeDate.getTime();
    const now = Date.now();
    let secDiff = (now - time) / 1000;
    if (isNaN(secDiff)) {
      return l10n.get('incorrectDate');
    }

    if (Math.abs(secDiff) > 60) {
      /*
       * Round milliseconds up if difference is over 1 minute so the result is
       * closer to what the user would expect (1h59m59s300ms diff should return
       * "in 2 hours" instead of "in an hour")
       */
      secDiff = secDiff > 0 ? Math.ceil(secDiff) : Math.floor(secDiff);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMidnight = today.getTime();
    const yesterdayMidnight = todayMidnight - 86400 * 1000;
    const oneWeekAgo = todayMidnight - 86400 * 1000 * 7;

    const thisyearTimestamp = new Date(
      today.getFullYear().toString()
    ).getTime();
    // Ex. 11:59 PM or 23:59
    const timeFormat = window.api.hour12 ? '%I:%M %p' : '%H:%M';
    // Unit: s
    const fourHour = 4 * 60 * 60;
    const dateLanguage = navigator.language;
    const { hour12 } = window.api;

    if (time < thisyearTimestamp && secDiff < fourHour) {
      // Last year but within 4 hours: December31, 2015, 11:59 PM
      return timeDate.toLocaleString(dateLanguage, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12
      });
    } else if (time < yesterdayMidnight && secDiff < fourHour) {
      // Yesterday but within 4 hours: Yesterday, 11:59 PM
      const hourtime = timeDate.toLocaleString(dateLanguage, {
        hour: 'numeric',
        minute: 'numeric',
        hour12
      });
      return l10n.get('yesterday-time', {
        hourtime
      });
    } else if (time < thisyearTimestamp) {
      // Before this year, ex. December 31, 2015 11:59 PM
      return dateFormat.localeFormat(
        new Date(time),
        `%a, %b %e, %Y, ${timeFormat}`
      );
    } else if (time < oneWeekAgo) {
      return dateFormat.localeFormat(
        new Date(time),
        `%a, %B %e, ${timeFormat}`
      );
    } else if (time < yesterdayMidnight) {
      return dateFormat.localeFormat(new Date(time), `%A, ${timeFormat}`);
    } else if (time < todayMidnight) {
      // Yesterday
      return `${l10n.get('days-ago-long', { value: 1 })},
        ${dateFormat.localeFormat(new Date(time), timeFormat)}`;
    } else if (secDiff > 3600 * 4) {
      // Today and before 4 hours
      return `${l10n.get('days-ago-long', { value: 0 })},
        ${dateFormat.localeFormat(new Date(time), timeFormat)}`;
    }
    // In 4 hours
    const f = useCompactFormat ? '-short' : '-long';
    const parts = dateFormat.relativeParts(secDiff);

    const affix = secDiff >= 0 ? '-ago' : '-until';
    // eslint-disable-next-line
    for (let i in parts) {
      return l10n.get(i + affix + f, { value: parts[i] });
    }
  };

  /*
   * Get's the DOM nodes for the Download Node to apply
   * the specific style
   * @param {DOM element} Given a Download LI generated with the
   *   create method, returns in an object the different components
   *   making them accessible via name
   */
  const getElements = function getElements(domElement) {
    const domNodes = {};

    // Const asides = domElement.querySelectorAll('aside');
    const pTextContainer = domElement.querySelector('div.textContainer');

    domNodes.asideStatus = pTextContainer.querySelector('aside:not(pack-end)');
    domNodes.asideAction = pTextContainer.querySelector('aside.pack-end');

    domNodes.progress = pTextContainer.querySelector('gaia-progress');

    // Should never change with current UI specs
    domNodes.fileName = pTextContainer.querySelector('p.fileName');

    const sizeContainer = pTextContainer.querySelector('div.sizeContainer');
    domNodes.sizeContainer = sizeContainer;
    domNodes.percent = sizeContainer.querySelector('.percent');
    domNodes.downloadedSize = sizeContainer.querySelector('.downloadedSize');
    domNodes.size = pTextContainer.querySelector('p.size');
    domNodes.date = pTextContainer.querySelector('p.date');

    return domNodes;
  };

  const getDownloadId = function getDownloadId(download) {
    /*
     * We need to use this to generate our id because datastore ids are not
     * compatible with dom element ids.
     */
    return DownloadFormatter.getUUID(download);
  };

  const updateDownloadId = function updateDownloadId(download, domElement) {
    // Get our new element id.
    const id = getDownloadId(download);
    // Update all the relevant instances of the item id.
    domElement.id = id;
    domElement.dataset.id = id;
    domElement.getElementsByTagName('input')[0].value = id;
  };

  const getDownloadState = function getDownloadState(download) {
    let { state } = download;

    if (state === 'stopped') {
      if (download.error !== null) {
        state = 'failed';
      } else if (!window.navigator.onLine) {
        // Remain downloading state when the connectivity was lost
        state = 'downloading';
      }
    }

    return state;
  };

  const updateDownloadDate = function updateDownloadDate() {
    const listItems = document.querySelectorAll('#downloadList li');

    for (let i = 0; i < listItems.length; i++) {
      const download = DownloadApiManager.getDownload(listItems[i].dataset.id);
      listItems[i].querySelector('.date').textContent = getDate(download);
    }
  };

  return {
    create,
    refresh: update,
    getDownloadId,
    updateDownloadId,
    updateDownloadDate
  };
})();

window.DownloadItem = DownloadItem;
