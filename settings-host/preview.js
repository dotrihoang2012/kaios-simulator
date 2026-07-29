// Standalone preview: starts the settings host server and opens the REAL
// KaiOS Settings app in a phone-sized Electron window. For eyeballing before
// integrating into the simulator.
//
//   ./node_modules/electron/dist/electron.exe settings-host/preview.js          (keeps saved settings)
//   ./node_modules/electron/dist/electron.exe settings-host/preview.js --reset  (wipes them first)
//
// Arrow keys navigate, Enter opens a panel, Backspace goes back (real app).
const { app, BrowserWindow, session } = require('electron');
const fs = require('fs');
const path = require('path');
require('./server.js'); // starts the app (9080) + shared (8081) servers in-process

app.commandLine.appendSwitch('host-resolver-rules', 'MAP shared.localhost 127.0.0.1');

app.whenReady().then(async () => {
  const ses = session.fromPartition('persist:kaios-settings');
  if (process.argv.includes('--reset')) await ses.clearStorageData();
  const win = new BrowserWindow({
    width: 240, height: 320, useContentSize: true, resizable: true,
    title: 'Settings',icon: path.join(__dirname, 'settings_112.png'),
    webPreferences: { webSecurity: false, nodeIntegration: false, contextIsolation: true, session: ses },
  });
  win.setMenuBarVisibility(false);
  // give the servers a beat to bind, then load
  setTimeout(() => win.loadURL('http://localhost:9080/'), 400);
  win.webContents.on('did-finish-load', () => win.webContents.focus());
});

app.on('window-all-closed', () => app.quit());
