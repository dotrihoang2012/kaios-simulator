window.AppOrigin = {
  getRootDomain: () => {return 'localhost'},
  getOrigin: (name) => {return `http://${name}.localhost`},
  getManifestURL: (name) => {return `http://${name}.localhost/manifest.webmanifest`},
  getManifestName: jest.fn(),
  getProtocol: jest.fn()
};
