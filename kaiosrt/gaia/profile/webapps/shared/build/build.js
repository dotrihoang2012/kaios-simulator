const utils = require('utils');

const SharedAppBuilder = function () {}; // eslint-disable-line

SharedAppBuilder.prototype.APP_DIR = 'apps/shared';
SharedAppBuilder.prototype.BUILD_DIR = 'build_stage/shared';
SharedAppBuilder.prototype.WALLPAPER_PATH = 'resources/media/wallpapers';
SharedAppBuilder.prototype.SEARCH_PROVIDER_IN_FILE =
  'search_providers_input.json';
SharedAppBuilder.prototype.SEARCH_PROVIDER_OUT_FILE = 'search_providers.json';

// Set options
SharedAppBuilder.prototype.setOptions = function setOptions(options) {
  const wallpaperDirPath = [options.STAGE_APP_DIR].concat(
    this.WALLPAPER_PATH.split('/')
  );
  this.wallpaperDir = utils.getFile.apply(utils, wallpaperDirPath); // eslint-disable-line
  this.gaia = utils.gaia.getInstance(options);
};

// Copy Distribution Wallpapers
SharedAppBuilder.prototype.copyDistributionWallpapers = function copyDistributionWallpapers() {
  if (!this.gaia.distributionDir) {
    return;
  }
  const dir = utils.getFile(this.gaia.distributionDir, 'wallpapers');
  if (!dir.exists()) {
    return;
  }
  utils.log('Include wallpapers in distribution directory ...\n');
  const files = utils.ls(dir);
  files.forEach(file => {
    utils.copyFileTo(file.path, this.wallpaperDir.path, file.leafName);
  });
};

// Copy Languages
SharedAppBuilder.prototype.copyLanguages = function copyLanguages(options) {
  if (!options.LOCALES_FILE) {
    return;
  }

  const languagePath = utils.joinPath(options.GAIA_DIR, options.LOCALES_FILE);
  const languageFile = utils.getFile(languagePath);
  if (languageFile.exists()) {
    const stageFileParent = utils.joinPath(options.STAGE_APP_DIR, 'resources/');
    utils.copyFileTo(languageFile, stageFileParent, 'languages.json');
  }
};

SharedAppBuilder.prototype.generateSearchProviderJson = function generateSearchProviderJson(
  options
) {
  const searchProviderJson = utils.getJSON(
    utils.getFile(
      options.APP_DIR,
      'js',
      'helper',
      'search_provider',
      this.SEARCH_PROVIDER_IN_FILE
    )
  );

  if (options.VARIANT_PATH) {
    const variantJson = utils.getJSON(utils.getFile(options.VARIANT_PATH));
    if ('search_partner_code' in variantJson) {
      searchProviderJson.partner_code = variantJson.search_partner_code;
    }
  }

  const content = JSON.stringify(searchProviderJson);
  const resultFile = utils.getFile(
    options.APP_DIR,
    'js',
    'helper',
    'search_provider',
    this.SEARCH_PROVIDER_OUT_FILE
  );
  const stageFileParent = utils.joinPath(
    options.STAGE_APP_DIR,
    'js',
    'helper',
    'search_provider'
  );

  if (resultFile.exists()) {
    const prev = utils.getFileContent(resultFile);
    if (prev === content) {
      utils.copyFileTo(resultFile, stageFileParent, resultFile.leafName);
      return;
    }
  }

  utils.writeContent(resultFile, content);
  utils.copyFileTo(resultFile, stageFileParent, resultFile.leafName);
};

SharedAppBuilder.prototype.execute = function execute(options) {
  const configExclude = {
    exclude: ['coverage', 'karma.conf.js', 'apns']
  };
  utils.copyToStage(options, configExclude);
  this.setOptions(options);
  this.copyDistributionWallpapers();
  this.copyLanguages(options);
  this.generateSearchProviderJson(options);
};

exports.execute = options => {
  new SharedAppBuilder().execute(options);
};
