import Service from 'service';
import { toL10n } from '../util/utils';

export const appState = new Map();

export function uninstallApp(app, name) {
  Service.request('showDialog', {
    type: 'confirm',
    ok: 'uninstall',
    header: toL10n('confirmation'),
    content: toL10n('confirm-to-uninstall-app', {
      appName: name
    }),
    translated: true,
    onOk: () => {
      appState.set('uninstalling', true);
      let request = AppsManager.uninstall(app.manifestUrl);
      let refreshState = () => appState.set('uninstalling', false);
      request.onerror = refreshState;
    }
  });
}
