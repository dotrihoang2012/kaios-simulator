'use strict';
/* global Service, DownloadUI, DownloadHelper */
const DownloadHandler = (function () {
  const _ = window.api.l10n.get;

  function fileNotFoundDialog(filename) {
    Service.request('DialogService:show', {
      id: 'download_file_not_found',
      header: _('download_file_not_found_title'),
      content: _('download_file_not_found_body', {filename: filename}),
      type: 'alert',
      translated: true,
      noClose: true,
      onOk: () => {
        Service.request('DialogService:hide', 'download_file_not_found');
      }
    });
  }

  function handlerOpenDownload({ download, filename }) {
    // Attempts to open the file
    const req = DownloadHelper.open(download);
    req.onerror = () => {
      handlerError({
        filename,
        download,
        error: req.error
      });
    };
  }

  /**
   * DownloadUI will use an existing DOM element to render the dialog,
   * which may cause problem in system app. So we have our own UI.
   */
  function handlerError({ filename, download, error }) {
    // Canceled activites are normal and shouldn't be interpreted as errors.
    // Unfortunately, this isn't reported in a standard way by our
    // applications (or third party apps for that matter). This is why we
    // have this lazy filter here that may need to be updated in the future
    // but hopefully will just get removed.
    if (error.message &&
      (error.message.toLowerCase().endsWith('canceled') ||
      error.message.toLowerCase().endsWith('cancelled'))) {
      return;
    }
    let onOk;
    switch (error.code) {
      case 'NO_SDCARD':
      case 'UNMOUNTED_SDCARD':
      case 'FILE_NOT_FOUND':
      case 'NO_PROVIDER':
        break;

      case 'MIME_TYPE_NOT_SUPPORTED':
      default:
        onOk = () => {
          // We need to wait the current dialog to close because DialogService
          // does not support multiple dialogs.
          window.setTimeout(() => {
            showDownloadUI(filename, DownloadUI.TYPE.DELETE, () => {
              DownloadHelper.remove(download);
            });
          });
        };
        break;
    }

    showDownloadUI(filename, DownloadUI.TYPE[error.code], onOk);
  }

  function showDownloadUI(fileName, type, onOk) {
    var message = '';
    var _ = window.api.l10n.get;
    var args = Object.create(null);
    args.name = fileName;

    if (type.name === DownloadUI.TYPE['FILE_NOT_FOUND'].name) {
      message = _('download_file_not_found_body', {filename: fileName});
    } else {
      message = _(type.name + '_download_message', args);
    }

    Service.request('DialogService:show', {
      header: _(type.name + '_download_title'),
      content: message,
      type: onOk ? 'confirm' : 'alert',
      translated: true,
      onOK: onOk
    });
  }

  return {
    fileNotFoundDialog,
    handlerError,
    handlerOpenDownload,
    showDownloadUI
  };
})();
window.DownloadHandler = DownloadHandler;
