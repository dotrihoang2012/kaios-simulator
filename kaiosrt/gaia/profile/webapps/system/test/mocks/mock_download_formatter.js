global.DownloadFormatter = {
  getFormattedSize: () => {
    return 100;
  },
  getPercentage: () => {
    return 14;
  },
  getFileName: () => {
    return '5MB.zip';
  },
  getTotalSize: () => {
    
    return 200;
  },
  getDownloadedSize: () => {

    return 100;
  },
  getDate: (download, callback) => {

    callback && callback('yesterday, 10');
  },
  getUUID: () => {
    return 'download-12';
  }
}
