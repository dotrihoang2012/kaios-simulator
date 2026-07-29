import SpeedDialStore from 'speed_dial_store';
import Service from 'service';
import dialHelper from './util/dial_helper';
import Qwerty from './util/qwerty';
import LaunchStore from './util/launch_store';
import forceSettingsName from './Configs/defaultForceSettingsName';
import * as utils from './util/utils';

class SpeedDialHelper {
  name = 'SpeedDialHelper';

  speedDial(speedDialNumber) {
    const forceSettings = Service.query('forceSettings');
    const customOptions = forceSettings[forceSettingsName[3]];
    if (utils.customEvtentKey(String(speedDialNumber), customOptions, LaunchStore)) {
      return;
    }

    let index = speedDialNumber - 1;
    if (index < 0) {
      return;
    }

    // need to choose sim card at first
    if (0 === index) {
      this.dialVoicemail();
      return;
    }

    let _tel = SpeedDialStore.contacts[index].tel;

    if (_tel) {
      dialHelper.dial(_tel, { 'speedDial': true })
        .catch((err) =>
          err === 'BlockNumber' && dialHelper.showLimitNumberDialog());
    } else {
      this.assignSpeedDial(speedDialNumber);
    }
  }

  dialVoicemail() {
    Service.request('chooseSim', 'call').then((cardIndex = 0) => {
      let value = SpeedDialStore['ril.iccInfo.mbdn'];
      let voicemail =
        (Array.isArray(value) ? value[cardIndex] : value) ||
        (navigator.b2g.voicemail && navigator.b2g.voicemail.getNumber(cardIndex));

      if (voicemail) {
        dialHelper.dial(voicemail, {
          'serviceId': cardIndex,
          'speedDial': true
        })
        .catch((err) =>
          err === 'BlockNumber' && dialHelper.showLimitNumberDialog());
      } else {
        this.assignSpeedDial(1);
      }
    });
  }

  assignSpeedDial(num) {
    num = Number(num);
    if (!num) {
      console.warn('no number to assign SpeedDial');
      return;
    }
    if (1 === num) {
      Service.request('showDialog', {
        type: 'alert',
        header: 'confirmation',
        content: 'assign-voicemail'
      });
    } else {
      Service.request('showDialog', {
        ok: 'assign',
        type: 'confirm',
        header: utils.toL10n('confirmation'),
        content: utils.toL10n('assign-speed-dial', { n: num }),
        translated: true,
        onOk: () => {
          utils.pickContact((result) => {
            let id = result.id;
            if (!result || !id) {
              console.warn('pickContact wihtout result');
              return;
            }
            if (!result.tel && !result.tel[0] && !result.tel[0].value) {
              window.alert(utils.toL10n('alert-for-contacts-without-number'));
              return;
            }
            SpeedDialStore.set(true, {
              dialKey: num,
              tel: result.tel[0].value,
              contactId: id
            });
          });
        }
      });
    }
  }

  removeSpeedDial({ number, name, cb }) {
    let callback = () => {
      if ('function' === typeof cb) {
        cb();
      }
    };
    Service.request('showDialog', {
      ok: 'remove',
      type: 'confirm',
      header: utils.toL10n('confirmation'),
      content: utils.toL10n('remove-speed-dial', { name }),
      translated: true,
      onOk: () => {
        SpeedDialStore.remove(number);
      },
      onCancel: callback,
      onBack: callback
    });
  }

  replaceSpeedDial({ number, name, contactId }) {
    let originNumber = SpeedDialStore.contacts[number - 1].tel;
    utils.pickContact((e) => {
      let result = e.target.result;
      let id = result.id;
      if (!result || !id) {
        console.warn('pickContact wihtout result');
        return;
      }

      let tel = result.tel[0].value;
      let subName = result.name[0] || tel;

      if (`${contactId}-${name}-${originNumber}` === `${id}-${subName}-${tel}`) {
        SpeedDialStore.set(false, {
          dialKey: number,
          tel: tel,
          contactId: id
        });
      } else {
        Service.request('showDialog', {
          ok: 'replace',
          type: 'confirm',
          header: utils.toL10n('confirmation'),
          content: utils.toL10n('replace-speed-dial', { name, subName }),
          translated: true,
          onOk: () => {
            SpeedDialStore.set(false, {
              dialKey: number,
              tel: tel,
              contactId: id
            });
          }
        });
      }
    });
  }

  register(element) {
    element.addEventListener('keydown', this._handle_keydown);
    element.addEventListener('keyup', this._handle_keyup);
  }

  unregister(element) {
    element.removeEventListener('keydown', this._handle_keydown);
    element.removeEventListener('keyup', this._handle_keyup);
  }

  _handle_keyup = (evt) => {
    if (!Service.query('Dialer.ready') ||
        !this.pressingTimer ||
        Service.query('LaunchStore.isLaunching')) {
      return;
    }
    let key = Qwerty.translate(evt.key);
    switch (key) {
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
      case '*':
      case '#':
      case '+':
        window.clearTimeout(this.pressingTimer);
        this.pressingTimer = null;
        if (!Service.query('App.panelAnimationRunning')) {
          Service.request('Dialer:show', key);
        }
        break;
      default:
        break;
    }
  }

  _handle_keydown = (evt) => {
    if (!Service.query('Dialer.ready') || Service.query('LaunchStore.isLaunching')) {
      return;
    }
    let key = Qwerty.translate(evt.key);
    if (this.pressingTimer) {
      window.clearTimeout(this.pressingTimer);
      this.pressingTimer = null;
    }
    switch (key) {
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        this.pressingTimer = window.setTimeout(() => {
          this.speedDial(parseInt(key, 10));
          this.pressingTimer = null;
        }, 1500);
        break;
      case '*':
      case '#':
      case '+':
        this.pressingTimer = window.setTimeout(() => {
          this.pressingTimer = null;
        }, 500);
        break;
      default:
        break;
    }
  }
}

const speedDialHelper = new SpeedDialHelper();
export default speedDialHelper;
