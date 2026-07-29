'use strict';

/* global require */
const utils = require('utils');

class LauncherAppBuilder {
  constructor() {
    this.distDirPath = null;
    this.stageDir = null;
  }

  addCustomizeFiles() {
    const fileDir = utils.getFile(utils.joinPath(this.distDirPath, 'icons', 'launcher'));
    if (!fileDir.exists()) {
      return;
    }

    const files = utils.ls(fileDir);
    files.forEach((file) => {
      utils.copyFileTo(file.path,
        utils.joinPath(this.stageDir.path, 'style', 'images'),
          file.leafName, true);
    });
  }

  execute(options) {
    utils.copyToStage(options);
    this.stageDir = utils.getFile(options.STAGE_APP_DIR);
    this.distDirPath = options.GAIA_DISTRIBUTION_DIR;
    if (this.distDirPath) {
      this.addCustomizeFiles();
    }
  }
}

exports.execute = function(options) {
  (new LauncherAppBuilder()).execute(options);
};
