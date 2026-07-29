class MockManifestHelper {
  constructor(manifest) {
    for (const prop in manifest) {
      this[prop] = manifest[prop];
    }
  }

  get displayName() {
    return this.short_name || this.name;
  }
}

export default MockManifestHelper;
