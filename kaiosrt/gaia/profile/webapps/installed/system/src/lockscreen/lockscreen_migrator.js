window.addEventListener('lockscreen--deactivating', () => {
  window.dispatchEvent(new CustomEvent('lockscreen-appclosing'));
});

window.addEventListener('lockscreen--deactivated', () => {
  window.dispatchEvent(new CustomEvent('lockscreen-appclosed'));
});

window.addEventListener('lockscreen--activated', () => {
  window.dispatchEvent(new CustomEvent('lockscreen-appopened'));
});
