/**
 * This lib relies on `l10n.js' to implement localizable date/time strings.
 *
 * The proposed `DownloadFormatter' object provides features for formatting
 * the data retrieved from the new API for Downloads, taking into account
 * the structure defined by the API itself.
 * WARNING: this library relies on the non-standard `toLocaleFormat()' method,
 * which is specific to Firefox -- no other browser is supported.
 */

// eslint-disable-next-line
(function(exports) {
  const NUMBER_OF_DECIMALS = 1;
  const BYTE_SCALE = ['B', 'KB', 'MB', 'GB', 'TB'];

  function getFormattedSizes(bytes) {
    if (typeof bytes === 'undefined' || isNaN(bytes)) {
      return null;
    }

    let index = 0;
    while (bytes >= 1024 && index < BYTE_SCALE.length) {
      bytes /= 1024;
      ++index;
    }

    return l10n.get('fileSize', {
      size: bytes.toFixed(NUMBER_OF_DECIMALS),
      unit: l10n.get(`byteUnit-${BYTE_SCALE[index]}`)
    });
  }

  function calcPercentage(currently, total) {
    if (total === 0) {
      return 0;
    }

    return parseInt((100 * currently) / total, 10);
  }

  const DownloadFormatter = {
    getFormattedSize(bytes) {
      return getFormattedSizes(bytes);
    },
    getPercentage(download) {
      return calcPercentage(download.currentBytes, download.totalBytes);
    },
    getFileName(download) {
      return download.path.split('/').pop(); // Filename.ext
    },
    getTotalSize(download) {
      const bytes = download.totalBytes;
      return getFormattedSizes(bytes);
    },
    getDownloadedSize(download) {
      const bytes = download.currentBytes;
      return getFormattedSizes(bytes);
    },
    getDate(download, callback) {
      let date = null;

      try {
        date = download.startTime;
      } catch (ex) {
        date = new Date();
        console.error(ex);
      }

      const prettyDate = l10n.DateTimeFormat().fromNow(date);
      // eslint-disable-next-line
      callback && callback(prettyDate);
    },
    getUUID(download) {
      return download.id || this.getFileName(download);
    }
  };

  exports.DownloadFormatter = DownloadFormatter;
  // eslint-disable-next-line
})(this);
