'use strict';

const utils = require('utils');
const BrowserAppBuilder = function() {};

function pickAsset(root, filename, ppx) {
  if (ppx !== '1') {
    const suffix = '@' + ppx + 'x';
    const hdpiFile = filename.replace(/(\.[a-z]+$)/, suffix + '$1');
    const file = utils.getFile(root.path, hdpiFile);
    if (file.exists()) {
      return file;
    }
  }
  return utils.getFile(root.path, filename);
}

BrowserAppBuilder.prototype.CUSTOMIZATION_TOPSITES_PATH = 'browser/customization/';

BrowserAppBuilder.prototype.setOptions = function(options) {
  this.stageDir = utils.getFile(options.STAGE_APP_DIR);
  this.appDir = utils.getFile(options.APP_DIR);
  this.preloadDir = utils.getFile(this.appDir.path, 'browser', 'preload');
  this.distDirPath = options.GAIA_DISTRIBUTION_DIR;
  const customizationTopsitesDirPath =
    [options.STAGE_APP_DIR].concat(this.CUSTOMIZATION_TOPSITES_PATH.split('/'));
  this.customizationTopsitsDir =
    utils.getFile.apply(utils, customizationTopsitesDirPath);
};

BrowserAppBuilder.prototype.initTopsitesJSON = function() {
  const defaultJSONpath =
    utils.joinPath(this.appDir.path, 'browser', 'preload', 'topsites.json');
  const defaultJson = utils.getJSON(utils.getFile(defaultJSONpath));
  defaultJson.forEach((site) => {
    if (site.tilePath) {
      const file = pickAsset(this.preloadDir, site.tilePath,
                           this.options.GAIA_DEV_PIXELS_PER_PX);
      const icon = utils.getFileAsDataURI(file);
      site.tile = icon;
      delete site.tilePath;
    }
  });

  const file = utils.getFile(this.stageDir.path, 'browser', 'js', 'inittopsites.json');
  const fileContents = utils.getDistributionFileContent('topsites', defaultJson,
                                                      this.distDirPath);
  utils.writeContent(file, fileContents);
};

BrowserAppBuilder.prototype.customizationTopsitesJSON = function() {
  const defaultJSONpath =
    utils.joinPath(this.stageDir.path, 'browser', 'customization', 'topsites.json');

  const dir = utils.getFile(defaultJSONpath);
  if (!dir.exists()) {
    return;
  }

  const defaultJson = utils.getJSON(utils.getFile(defaultJSONpath));

  defaultJson.forEach((site) => {
    if (site.tilePath) {
      const file = pickAsset(this.customizationTopsitsDir, site.tilePath,
                           this.options.GAIA_DEV_PIXELS_PER_PX);
      const icon = utils.getFileAsDataURI(file);
      site.tile = icon;
      delete site.tilePath;
    }
  });

  const file =
    utils.getFile(this.stageDir.path, 'browser', 'js', 'customizationtopsites.json');
  const fileContents = utils.getDistributionFileContent('topsites', defaultJson,
                                                      this.distDirPath);
  utils.writeContent(file, fileContents);
};

BrowserAppBuilder.prototype.copyDistributionTopsites = function() {
  if (!this.distDirPath) {
    return;
  }

  const dir = utils.getFile(this.distDirPath, 'topsites');
  if (!dir.exists()) {
    return;
  }

  utils.log('Include customization topsites in distribution directory');

  const files = utils.ls(dir);

  files.forEach((file) => {
    file.copyTo(this.customizationTopsitsDir, file.leafName);
  });
};

BrowserAppBuilder.prototype.execute = function(options) {
  this.options = options;
  this.setOptions(options);
  this.copyDistributionTopsites();
  if (options.PROFILE_FOLDER !== 'profile-test') {
    this.initTopsitesJSON();
    this.customizationTopsitesJSON();
  }
};

exports.execute = function(options) {
  (new BrowserAppBuilder()).execute(options);
};
