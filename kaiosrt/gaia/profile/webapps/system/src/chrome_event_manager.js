var ChromeEventManager = {
  start: function() {
    window.addEventListener('mozChromeEvent', this);
  },
  handleEvent: function(evt) {
    window.dispatchEvent(new CustomEvent('mozChrome-' + evt.detail.type, {
      detail: evt.detail
    }));
  }
}

ChromeEventManager.start();
export default ChromeEventManager;
