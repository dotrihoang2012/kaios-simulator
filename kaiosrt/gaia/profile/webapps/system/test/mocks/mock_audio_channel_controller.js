class MockAudioChannelController {
  constructor(app, audioChannel) {
    this.app = app;
    this.name = audioChannel.name;
    this.instanceID = this.app.instanceID + '_' + this.name;
    this._policy = {};
  }
  isActive() {}
  isPlaying() {}
  isFadingOut() {}
  setPolicy(policy) {
    this._policy = policy;
    return this;
  }
  getPolicy() {
    return this._policy;
  }
  proceedPolicy() {
    return this;
  }
  destroy() {}
}

export default MockAudioChannelController;
