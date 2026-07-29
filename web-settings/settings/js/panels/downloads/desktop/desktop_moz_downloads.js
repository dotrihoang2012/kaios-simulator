

const DEFAULT_DOWNLOAD = {
  id: '0',
  totalBytes: 1800,
  currentBytes: 100,
  url: 'http://firefoxos.com/archivo.mp3',
  path: '//SDCARD/Downloads/archivo.mp3',
  state: 'downloading',
  contentType: 'audio/mpeg',
  started: new Date()
};

const MOCK_LENGTH = 10;

function MockDownload(params) {
  params = params || {};
  this.id = params.id || '0';
  this.totalBytes = params.totalBytes || DEFAULT_DOWNLOAD.totalBytes;
  this.currentBytes = params.currentBytes || DEFAULT_DOWNLOAD.currentBytes;
  this.url = params.url || DEFAULT_DOWNLOAD.url;
  this.path = params.path || DEFAULT_DOWNLOAD.path;
  this.state = params.state || DEFAULT_DOWNLOAD.state;
  this.contentType = params.contentType || DEFAULT_DOWNLOAD.contentType;
  this.started = params.started || DEFAULT_DOWNLOAD.started;
}

MockDownload.prototype = {
  // eslint-disable-next-line
  pause() {},
  // eslint-disable-next-line
  resume() {}
};

function getState(i) {
  if (i === 0) {
    return 'stopped';
  }
  return 'downloading';
}

// eslint-disable-next-line
navigator.b2g.downloadManager = {
  getDownloads() {
    return {
      then(fulfill) {
        const mockDownloads = [];
        for (let i = 0; i < MOCK_LENGTH; i++) {
          const download = new MockDownload({
            id: `message-${i}`,
            url: `http://firefoxos.com/archivo${i}.mp3`,
            path: `//SDCARD/Downloads/archivo${i}.mp3`,
            state: getState(i)
          });
          mockDownloads.push(download);
        }
        setTimeout(() => {
          fulfill(mockDownloads);
        });
      }
    };
  },
  remove() {
    return {
      then(fulfill) {
        setTimeout(fulfill);
      }
    };
  },
  set ondownloadstart(handler) {
    // Mock that a new download has been started
    setTimeout(() => {
      const newID = MOCK_LENGTH + 10;
      const download = new MockDownload({
        id: `message-${newID}`,
        url: 'http://firefoxos.com/loremipsumblablablablablablablablabla.mp3',
        path: '//SDCARD/Downloads/newFile.mp3',
        state: 'downloading'
      });
      handler({
        download
      });
    }, 5000);
  }
};
