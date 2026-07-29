'use strict';

const utils = require('utils');

const SystemAppBuilder = function() {};

// set options
SystemAppBuilder.prototype.setOptions = function(options) {
  this.stageDir = utils.getFile(options.STAGE_APP_DIR);
  this.appDir = utils.getFile(options.APP_DIR);
  this.distDirPath = options.GAIA_DISTRIBUTION_DIR;
};

SystemAppBuilder.prototype.addCustomizeFiles = function() {
  const self = this;
  let fileDir = null;
  let files = null;
  if (utils.getFile(this.distDirPath, 'power').exists()) {
    fileDir = utils.getFile(this.distDirPath, 'power');
    files = utils.ls(fileDir);
    files.forEach(function(file) {
      utils.copyFileTo(file.path,
        utils.joinPath(self.stageDir.path, 'resources', 'power'),
        file.leafName, true);
    });
  }

  if (utils.getFile(this.distDirPath, 'branding').exists()) {
    fileDir = utils.getFile(this.distDirPath, 'branding');
    files = utils.ls(fileDir);
    files.forEach(function(file) {
      utils.copyFileTo(file.path,
        utils.joinPath(self.stageDir.path, 'shared', 'resources', 'branding'),
        file.leafName, true);
    });
  }

  if (utils.getFile(this.distDirPath, 'jio_instant_settings').exists()) {
    fileDir = utils.getFile(this.distDirPath, 'jio_instant_settings');
    files = utils.ls(fileDir);
    files.forEach(function(file) {
      utils.copyFileTo(file.path,
        utils.joinPath(self.stageDir.path, 'resources', 'jio_instant_settings'),
        file.leafName, true);
    });
  }

  if (utils.getFile(this.distDirPath, 'icons', 'system').exists()) {
    fileDir = utils.getFile(this.distDirPath, 'icons', 'system');
    files = utils.ls(fileDir);
    files.forEach(function(file) {
      utils.copyFileTo(file.path,
        utils.joinPath(self.stageDir.path, 'style', 'icons'),
        file.leafName, true);
    });
  }

  if (utils.getFile(this.distDirPath, 'voice_input').exists()) {
    fileDir = utils.getFile(this.distDirPath, 'voice_input');
    files = utils.ls(fileDir);
    files.forEach(function(file) {
      utils.copyFileTo(file.path,
        utils.joinPath(self.stageDir.path, 'resources', 'voice_input'),
        file.leafName, true);
    });
  }
};

SystemAppBuilder.prototype.initConfigJsons = function(options) {
  const iccDefault = { defaultURL: 'http://www.mozilla.org/en-US/firefoxos/' };
  const wapuaprofDefault = {};
  const euRoamingDefault = {};
  const memoryProfileDefault = {
    profile: (options.GAIA_MEMORY_PROFILE) ? options.GAIA_MEMORY_PROFILE : null
  };
  const iccFile = utils.getFile(this.stageDir.path, 'resources', 'icc.json');
  const wapFile = utils.getFile(this.stageDir.path, 'resources',
    'wapuaprof.json');
  const euRoamingFile = utils.getFile(this.stageDir.path, 'resources',
    'eu-roaming.json');
  const memoryProfile = utils.getFile(this.stageDir.path, 'resources',
    'memory-profile.json');

  utils.writeContent(iccFile,
    utils.getDistributionFileContent('icc', iccDefault, this.distDirPath));

  utils.writeContent(wapFile,
    utils.getDistributionFileContent('wapuaprof',
      wapuaprofDefault, this.distDirPath));

  utils.writeContent(euRoamingFile,
    utils.getDistributionFileContent('eu-roaming',
      euRoamingDefault, this.distDirPath));

  utils.writeContent(memoryProfile,
    utils.getDistributionFileContent('memory-profile',
      memoryProfileDefault, this.distDirPath));
};

SystemAppBuilder.prototype.execute = function(options) {
  this.setOptions(options);
  this.initConfigJsons(options);
  if (this.distDirPath) {
    this.addCustomizeFiles();
  }
};

exports.execute = function(options) {
  (new SystemAppBuilder()).execute(options);
};
