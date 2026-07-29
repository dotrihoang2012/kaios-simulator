import React from 'react';
import ReactDOM from 'react-dom';
import ReactSoftKey from 'react-soft-key';
import Service from 'service';
import ReactSimChooser from 'react-sim-chooser';
import OptionMenuRenderer from 'option_menu_renderer';
import DialogRenderer from 'dialog_renderer';
import dialHelper from './util/dial_helper';
import SettingsStore from './settings_store';
import '../style/scss/definitions.scss';
import '../style/scss/app.scss';

const servicesArray = [
  'settingsService',
  'devicecapabilityService',
  'contactsService',
];

class DialActivity extends React.Component {
  constructor(props) {
    super(props);
    navigator.serviceWorker.addEventListener('message', this.activityHandler.bind(this));
  }

  name = 'DialActivity';

  activityHandler(activityRequest) {
    window.libSession.initService(servicesArray).then(() => {
      SettingsObserver.init();  // SettingsObserver init
      let option = activityRequest.data;
      if (option.name === 'dial') {
        window.api.l10n.once(() => {
          let number = option.data && option.data.number;

          if (!number) {
            window.close();
            return;
          }

          SettingsStore.waitForRttPref()
            .then(() => {
              const isRttAuto = SettingsStore.isRttAuto();
              const dialogOptions = {
                type: 'confirm',
                ok: isRttAuto ? 'rtt-call' : 'call',
                cancel: 'cancel',
                content: number,
                translated: true,
                onOk: () => {
                  dialHelper.dialForcely(number, { isRtt: isRttAuto })
                    .then(() => window.close())
                    .catch((err) => {
                      if (err === 'BlockNumber') {
                        dialHelper.showLimitNumberDialog(() => window.close());
                      } else {
                        window.close();
                      }
                    });
                },
                onCancel: () => { window.close(); },
                onBack: () => { window.close(); }
              };
              Service.request('showDialog', dialogOptions);
            });
        });
      }
    });
  }

  render() {
    return (
      <div className="app-workspace">
        <OptionMenuRenderer />
        <ReactSimChooser />
        <DialogRenderer />
        <ReactSoftKey />
      </div>
    );
  }
}

ReactDOM.render(<DialActivity />, document.getElementById('root'));
