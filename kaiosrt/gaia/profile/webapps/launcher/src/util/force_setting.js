import forceSettingsName from '../Configs/defaultForceSettingsName';

class ForceSetting {
  constructor() {
    this.settings = {};
    this.returnValueNum = 0;
  }

  getSettings() {
    return new Promise((res) => {
      forceSettingsName.forEach((name) => {
        SettingsObserver.getValue(name)
          .then((value) => {
            this.returnValueNum++;
            this.settings = Object.assign(this.settings, {
              [name]: value
            });
            if (this.returnValueNum === forceSettingsName.length) {
              res(this.settings);
            }
          });
      });
    });
  }
}

export default (new ForceSetting());
