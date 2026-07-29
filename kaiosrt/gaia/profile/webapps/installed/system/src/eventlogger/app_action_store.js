import ActionStore from './action_store';

class AppActionStore extends ActionStore {
  constructor() {
    super();
  }

  markAction(type, app) {
    var obj = {};
    var manifest = app.manifest || app.updateManifest;
    obj.app_id = app.manifestUrl;
    obj.app_version = manifest.version;
    obj.name = manifest.name;
    switch (type) {
      case 'installed':
        obj.install_status = true;
        this.save('app_install', obj);
        break;
      case 'installfailed':
        obj.install_status = false;
        this.save('app_install', obj);
        break;
      case 'uninstall':
        obj.open_count = app.open_count;
        this.save('app_uninstall', obj);
        break;
      case 'update':
        obj.update_status = true;
        obj.appver_new = manifest.version_new;
        // old version
        obj.app_version = manifest.version;
        obj.open_count = app.open_count;
        this.save('app_update', obj);
        break;
      case 'app_close':
        obj.open_duration = app.open_duration;
        this.save('app_close', obj);
        break;
      case 'app_open':
        obj.open_count = app.open_count;
        this.save('app_open', obj);
        break;
      case 'app_pause':
        this.save('app_pause', obj);
      default:
        break;
    }
  }

}

export default AppActionStore;