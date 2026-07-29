import BaseComponent from 'base-component';

class SpeedDialStore extends BaseComponent {
  SIZE = 9;
  contacts = [];
  voicemailNumber = null;

  start() {
    this.fetch();

    this.getCustomSpeedDials();
    SettingsObserver.observe('ril.iccInfo.mbdn', null,
      this['_observe_ril.iccInfo.mbdn']);
    ContactsManager.addEventListener(ContactsManager.EventMap.CONTACT_CHANGE,
      this.fetch.bind(this));
    ContactsManager.addEventListener(ContactsManager.EventMap.SPEED_DIAL_CHANGE,
      this.fetch.bind(this));
  }

  '_observe_ril.iccInfo.mbdn' = (value) => {
    this['ril.iccInfo.mbdn'] = value;
    value = (Array.isArray(value) ? value[0] : value) ||
            (navigator.b2g.voicemail && navigator.b2g.voicemail.getNumber(0));
    this.voicemailNumber = value;
    this.contacts[0].tel = value;
    this.emit('changed');
  }

  getCustomSpeedDials() {
    SettingsObserver.getValue('custom.speeddials')
      .then((customSpeedDials) => {
        if (!customSpeedDials) {
          return;
        }
        this.customSpeedDials = customSpeedDials;
        this.fillCustomSpeedDials(customSpeedDials);
        this.emit('changed');
      });
  }

  fillCustomSpeedDials(customSpeedDials = []) {
    customSpeedDials.forEach((customSpeedDial) => {
      let key = parseInt(customSpeedDial.key, 10);
      this.contacts[key - 1] = {
        dial: key,
        editable: false,
        tel: customSpeedDial.tel,
        name: customSpeedDial.name,
        id: 'customsd'
      };
    });
  }

  fetch() {
    this.initData();
    this.fillCustomSpeedDials(this.customSpeedDials);
    ContactsManager.getSpeedDials().then((result) => {
      this.parse(result);
    });
  }

  set(type, detail) {
    ContactsManager.setSpeedDial(type, detail)
      .catch((err) => console.warn('Failed to set speed dial', err));
  }

  remove(number) {
    ContactsManager.removeSpeedDial(number)
      .catch((err) => console.warn('Failed to remove speed dial', err));
  }

  initData() {
    this.contacts = Array(this.SIZE).fill(null).map((item, index) => {
      return {
        dial: index + 1,
        editable: true
      };
    });

    Object.assign(this.contacts[0], {
      tel: this.voicemailNumber,
      editable: false,
      voicemail: true,
      name: 'voicemail',
      id: 'voicemail'
    });
  }

  parse(configs) {
    let promises = configs.map((config) => {
      return new Promise((resolve) => {
        if (!config.contactId) {
          const speedDialNumber = parseInt(config.dialKey, 10);
          Object.assign(this.contacts[speedDialNumber - 1], {
            dial: speedDialNumber,
            tel: config.tel
          });
          resolve();
          return;
        }
        ContactsManager.getContactByID(config.contactId)
          .then((contact) => {
            if (!contact) {
              console.warn(`Con not find this contact by id: ${config.contactId}.`);
              resolve();
              return;
            }

            let photo;
            if (contact.photoBlob && contact.photoBlob.length) {
              photo = window.URL.createObjectURL(
                new Blob(contact.photoBlob, {
                  type: contact.photoType
                })
              );
            }

            let dial = parseInt(config.dialKey, 10);
            Object.assign(this.contacts[dial - 1], {
              id: config.contactId,
              name: contact.name && contact.name[0],
              photo,
              dial: dial,
              tel: config.tel
            });
            resolve();
          });
      });
    }, this);

    Promise.all(promises).then(() => {
      this.emit('changed');
    });
  }
}

const speedDialStore = new SpeedDialStore();
speedDialStore.start();

export default speedDialStore;
