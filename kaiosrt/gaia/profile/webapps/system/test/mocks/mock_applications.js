const MockApplications = {
  getByManifestURL: function(name) {
    if (name === 'app://sms.gaiamobile.org/manifest.webapp') {
      return { status: 0 };
    } else {
      return { status: 1, manifest: { icon: 'test.png' }};
    }
  },
  getSuitableIconSrc: jest.fn(),
  hasActivity: jest.fn(),
};
window.applications = MockApplications;
export default MockApplications;
