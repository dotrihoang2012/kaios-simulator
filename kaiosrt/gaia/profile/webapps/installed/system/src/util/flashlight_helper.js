import BaseModule from 'base-module';

class FlashlightHelper extends BaseModule {
  name = 'FlashlightHelper';

  constructor(props) {
    super(props);

    this.capability = false;

    // Do feature detection for flashlight.
    if (navigator.b2g.getFlashlightManager) {
      navigator.b2g.getFlashlightManager().then(this.init.bind(this), () => {
        this.capability = false;
      });
    }
  }

  init(flashlightManager) {
    this.capability = true;
    flashlightManager.addEventListener('flashlightchange', this);
    this.flashlightManager = flashlightManager;
    this.emit('ready', flashlightManager.flashlightEnabled);
  }

  _handle_flashlightchange() {
    this.emit('change', this.flashlightManager.flashlightEnabled);
  }

  toggle() {
    this.flashlightManager.flashlightEnabled = !this.flashlightManager.flashlightEnabled;
  }
}

export default (new FlashlightHelper());
