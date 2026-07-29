var MockNavigatorHasFeature = {
  hasFeature: function() {
    return new Promise(function(resolve, reject) {
      resolve(true);
    });
  }
};

export default MockNavigatorHasFeature;
