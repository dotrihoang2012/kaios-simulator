const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--disable-web-security'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', err => console.log('ERROR:', err.toString()));
  
  await page.goto('file:///D:/desktop/Tools/platform-tools/KaiOS/index.html');
  await new Promise(r => setTimeout(r, 2000));
  
  await page.evaluate(() => {
    localStorage.setItem('__kaiSettings', JSON.stringify({
      'wifi.enabled': false,
      'bluetooth.enabled': true,
      'audio.volume.notification': 0,
      'screen.brightness': 0.1
    }));
    window.dispatchEvent(new StorageEvent('storage', { key: '__kaiSettings' }));
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  const state = await page.evaluate(() => {
    return {
      wifi: document.getElementById('sb-wifi').style.display,
      bt: document.getElementById('sb-bluetooth').style.display,
      sound: document.getElementById('sb-sound').style.display,
      filter: document.getElementById('screen').style.filter
    };
  });
  
  console.log("State after sync:", state);
  await browser.close();
})();

