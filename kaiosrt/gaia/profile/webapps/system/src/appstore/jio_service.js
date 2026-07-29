import BaseModule from 'base-module';
import { DOWNLOAD_ERRORS_TO_CODE } from './constant';

class JioService extends BaseModule {
  constructor() {
    super();

    if (JioService.instance) {
      return JioService.instance;
    }

    JioService.instance = this;
  }

  addApp = (app) => {
    let manifest = app.manifest || app.updateManifest;

    if (manifest) {
      window.asyncStorage.getItem(app.manifestUrl, (value) => {
        if (!value) {
          this.debug(
            ' addApp  app id:: ' +
              app.manifestUrl +
              '     version:: ' +
              manifest.version
          );
          window.asyncStorage.setItem(
            app.manifestUrl,
            JSON.stringify({ version: manifest.version, isSilent: false })
          );
        }
      });
    }
  };

  handleAppInstalled = (app) => {
    let manifest = app.manifest || app.updateManifest;
    if (manifest) {
      this.debug(
        ' _handle_install url : ' +
          app.manifestUrl +
          '  version ::' +
          manifest.version
      );

      this.publish('applicationinstall-success', { application: app });
    }
  };

  handleDownloadSuccess = (app, isSilent) => {
    let manifest = app.manifest || app.updateManifest;

    window.asyncStorage.setItem(
      app.manifestUrl,
      JSON.stringify({ version: manifest.version, isSilent: isSilent })
    );
  };

  handleDownloadError = (downloadFailedReason, { isUpdate }) => {
    const { appsObject, reason } = downloadFailedReason;

    const error_code =
      DOWNLOAD_ERRORS_TO_CODE[reason] !== 'undefined'
        ? DOWNLOAD_ERRORS_TO_CODE[reason]
        : DOWNLOAD_ERRORS_TO_CODE['GENERIC_ERROR'];
    console.error('app download failed:', reason);
    this.debug('[APPSTORE]  downloadError e :: ' + JSON.stringify(downloadFailedReason));
    this.debug('[APPSTORE]  downloadError error code:: ' + error_code);
    //custome event for install or update fail case
    var eventType = isUpdate
      ? 'applicationupdate-failed'
      : 'applicationinstall-failed';

    this.publish(eventType, { application: appsObject, error_code: error_code });
  };
}

export default JioService;
