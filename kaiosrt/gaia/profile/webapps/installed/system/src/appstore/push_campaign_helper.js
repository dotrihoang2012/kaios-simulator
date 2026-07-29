import { getSimInfo } from './utils';

export async function getRegistrationPayload() {
  const payload = {
    clientInfo: {
      version: undefined,
      name: undefined,
    },
    defaultServiceId: undefined,
    deviceInfo: {
      connectionType: undefined,
      platform_build_id: undefined,
      build_number: undefined,
    },
    lang: undefined,
    simInfo: {
      icc_mcc: undefined,
      icc_mnc: undefined,
      icc_mcc2: undefined,
      icc_mnc2: undefined,
    },
    token: {
      kid: undefined,
      mac_key: undefined,
    },
    uuid: undefined,
    urls: {
      service_center: undefined,
      analytics_base: undefined,
    }
  };

  payload.lang = navigator.language;
  payload.deviceInfo.connectionType = (
    navigator.connection.type === 'wifi'
      ? 'wifi'
      : 'mobile'
  );

  try {
    payload.simInfo = getSimInfo();
  } catch (err) {
    debug('Failed to get ICC info', err);
  }

  try {
    const apiUri = await SettingsObserver.getValue('apps.serviceCenterUrl');
    payload.urls.service_center = apiUri;
  } catch (err) {
    debug('Failed to get service center apiUri', err);
  }

  try {
    const analyticsBaseUrl = await SettingsObserver.getValue('apps.analyticsEventBaseUrl');
    payload.urls.analytics_base = analyticsBaseUrl;
  } catch (err) {
    debug('Failed to get analytics base url', err);
  }

  try {
    const defaultServiceId = await SettingsObserver.getValue('ril.data.defaultServiceId');
    payload.defaultServiceId = defaultServiceId;
  } catch (err) {
    debug('Failed to get defaultServiceId', err);
  }

  try {
    const platformBuildId = await SettingsObserver.getValue('deviceinfo.platform_build_id');
    payload.deviceInfo.platform_build_id = platformBuildId;
  } catch (err) {
    debug('Failed to get platform_build_id', err);
  }

  try {
    const buildNumber = await SettingsObserver.getValue('deviceinfo.build_number');
    payload.deviceInfo.build_number = buildNumber;
  } catch (err) {
    debug('Failed to get build_number', err);
  }

  try {
    const uuid = await SettingsObserver.getValue('app.update.custom');
    payload.uuid = uuid;
  } catch (err) {
    debug('Failed to get uuid', err);
  }

  try {
    const manifestURL = window.AppOrigin.getManifestURL('kaios-store');
    const clientAppManifest = await fetch(manifestURL).then((response) => response.json());
    payload.clientInfo.name = clientAppManifest.name;
    payload.clientInfo.version = clientAppManifest.b2g_features.version;
  } catch (err) {
    debug('Failed to fetch client app info', err);
  }

  try {
    const token = await navigator.b2g.authorizationManager.getRestrictedToken('service');
    payload.token.kid = token.kid;
    payload.token.mac_key = token.macKey;
  } catch (err) {
    debug('Failed to get restricted token, reason=', err);
  }

  return payload;
}

function debug() {
  console.log('[PushCampaignHelper]', ...arguments);
}
