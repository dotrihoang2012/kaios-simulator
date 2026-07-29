import * as utils from './utils';

// Cache unchanged device information
var DEVICE_INFO = null;
var battery;
navigator.getBattery && navigator.getBattery().then(bat => {
  battery = bat;
});

var slotId = 0;

SettingsObserver.observe('ril.data.defaultServiceId',
  0,
  id => { slotId = id; });

function getDeviceInfo() {
  if (DEVICE_INFO !== null) {
    return Promise.resolve(DEVICE_INFO);
  }
  var deviceInfoQuery = {
    'deviceinfo.platform_build_id': '',
    'deviceinfo.cu': '',
    'deviceinfo.software': 'unknown',
    'app.update.custom': '',
    'deviceinfo.os': 'unknown'
  };
  return new Promise(function (resolve, reject) {
    utils.getSettings(deviceInfoQuery, (deviceInfo) => {
      DEVICE_INFO = deviceInfo;
      resolve(deviceInfo);
    });
  });
}

function getSIMInfo() {
  var simInfo = {
    network: null,
    icc: null
  };

  if (SIMSlotManager.noSIMCardConnectedToNetwork()) {
    // No connected SIMs
    return simInfo;
  }

  var slots = SIMSlotManager.getSlots().filter(function (slot) {
    return !slot.isAbsent() && !slot.isLocked();
  });

  if (slots.length === 0) {
    // No unlocked or active SIM slots
    return simInfo;
  }

  var conn = slots[0].conn;
  if (!conn) {
    // No connection
    return simInfo;
  }

  const iccObj = navigator.b2g.iccManager &&
    navigator.b2g.iccManager.getIccById(conn.iccId);
  var iccInfo = iccObj ? iccObj.iccInfo : null;
  var voiceNetwork = conn.voice ? conn.voice.network : null;
  if (!iccInfo && !voiceNetwork) {
    // No voice network or ICC info
    return simInfo;
  }

  simInfo.network = MobileOperator.userFacingInfo(conn);
  if (voiceNetwork) {
    simInfo.network.mnc = voiceNetwork.mnc;
    simInfo.network.mcc = voiceNetwork.mcc;
  }

  if (iccInfo) {
    simInfo.icc = {
      mnc: iccInfo.mnc,
      mcc: iccInfo.mcc,
      spn: iccInfo.spn
    };
  }

  return simInfo;
}

function getConnectionType() {
  var type = 'unknown';
  const conns = navigator.b2g.mobileConnections || [];
  if (navigator.b2g.wifiManager &&
    navigator.b2g.wifiManager.connection.status === 'connected') {
    type = 'wifi';
  } else if (conns[slotId] && conns[slotId].data.connected) {
    type = 'cell';
  }

  return type;
}

function connectionType() {
  if (
    navigator.b2g.wifiManager &&
    navigator.b2g.wifiManager.connection.status === 'connected'
  ) {
    return 'wifi';
  } else {
    const conns = navigator.b2g.mobileConnections || [];
    return conns[slotId] && conns[slotId].data.type;
  }
}

function isPluggedIn() {
  return battery && battery.charging;
}

function getStandardPackage() {
  var date = new Date();
  var uptime = Math.ceil(performance.now() / 1000) || 0;
  var packageData = {
    'schema_version': 1,
    'version': '1.1.2',
    'uptime': uptime,
    'event_type': '',
    'data': {},
    'device_uid': '',
    'kai_version': '',
    'kai_build_id': '',
    'curef': '',
    'device_utc': date.getTime(),
    'device_utc_offset': date.getTimezoneOffset(),
    'connection_type': getConnectionType(),
    'icc_mcc': 0,
    'icc_mnc': 0,
    'icc_spn': 0,
    'network_mcc': 0,
    'network_mnc': 0,
    'language': navigator.language,
    'plugged_in': isPluggedIn(),
    'audio_output': getAudioOutPut(),
    'battery_percentage': battery && battery.level * 100,
  };

  return new Promise((resolve, reject) => {
    getDeviceInfo().then(deviceInfo => {
      var simInfo = getSIMInfo();
      packageData['icc_mcc'] = simInfo.icc && simInfo.icc.mcc || 0;
      packageData['icc_mnc'] = simInfo.icc && simInfo.icc.mnc || 0;
      packageData['icc_spn'] = simInfo.icc && simInfo.icc.spn || 0;
      packageData['network_mcc'] = simInfo.network && simInfo.network.mcc || 0;
      packageData['network_mnc'] = simInfo.network && simInfo.network.mnc || 0;
      packageData['device_uid'] = deviceInfo['app.update.custom'] ||
        '4b810d98-1140-4e5e-9f84-92dc85d103d6';
      packageData['software_version'] = deviceInfo['deviceinfo.software'] ||
        'unknown';
      packageData['kai_version'] = deviceInfo['deviceinfo.os'] ||
        'unknown';
      packageData['kai_build_id'] = deviceInfo['deviceinfo.platform_build_id'] ||
        '20180103113616';
      packageData['curef'] = deviceInfo['deviceinfo.cu'] ||
        '4044O-2AAQUS0';

      resolve(packageData);
    })
  });
}

function getAudioOutPut() {
  var ret = 'phone';
  var bluetooth = null;
  var btConnected = false;
  if (navigator.b2g.bluetooth) {
    bluetooth = Bluetooth;
    btConnected = (bluetooth.isProfileConnected('a2dp') ||
      bluetooth.isProfileConnected('hfp') ||
      bluetooth.isProfileConnected('opp'));
  }
  if (bluetooth && btConnected && bluetooth.isProfileConnected('sco')) {
    ret = 'bluetooth';
  } else if (navigator.b2g.telephony && navigator.b2g.telephony.speakerEnabled) {
    ret = 'speaker';
  } else if (navigator.b2g.audioChannelManager
    && navigator.b2g.audioChannelManager.headphones) {
    ret = 'headphone';
  }

  return ret;
}

function getTimeZoneOffset() {
  let t = new Date();
  let tzo = -t.getTimezoneOffset();
  if (tzo !== 0) {
    tzo = tzo / 60;
  }
  return tzo;
}

function getTimeStamp() {
  let t = new Date();
  let tzo = -t.getTimezoneOffset();
  let dif = tzo >= 0 ? '+' : '-';
  return (
    t.getFullYear() +
    '-' +
    (t.getMonth() + 1).toString().padStart(2, '0') +
    '-' +
    t.getDate().toString().padStart(2, '0') +
    'T' +
    t.getHours().toString().padStart(2, '0') +
    ':' +
    t.getMinutes().toString().padStart(2, '0') +
    ':' +
    t.getSeconds().toString().padStart(2, '0') +
    dif +
    Math.abs(tzo / 60).toString().padStart(2, '0') +
    ':' +
    Math.abs(tzo % 60).toString().padStart(2, '0')
  );
}

var DeviceInfoComposer = {
  getStandardPackage: getStandardPackage,
  slotId: slotId,
  getDeviceInfo: getDeviceInfo,
  getConnectionType: getConnectionType,
  getTimeZoneOffset: getTimeZoneOffset,
  getTimeStamp: getTimeStamp,
  connectionType: connectionType
};

export default DeviceInfoComposer;
