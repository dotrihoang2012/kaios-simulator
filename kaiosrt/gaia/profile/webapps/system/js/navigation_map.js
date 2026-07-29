'use strict';

(function(exports) {

  var NavigationMap = {
    _controls: null,
    _oldFocusNode: null,
    _id:0, // used to generate nav-data-id
    _focus_index: 0,
    _bNumberChanged:false,
    init: function _init() {
      this.observeActionMenuState();
    },

    setFocusedIndex: function(index){
      this._focus_index = index;
    },

    removeFocus: function (){
      var focused = document.querySelectorAll(".focus");
      if (focused.length > 0) {
        focused[0].classList.remove('focus');
      }
    },

    getFocus : function() {
      var focusedNodes = document.querySelectorAll(".focus");
      return focusedNodes.length > 0 ? focusedNodes[0] : null;
    },

    observeActionMenuState : function() {
      var screen = document.getElementById('screen');

      var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          if(mutation.type == "attributes") {
            if(mutation.attributeName == "class") {
              if(mutation.target.classList.contains("action-menu")) {
                 window.setTimeout( function() {
                    NavigationMap.reset();
                      },400);
              }else if(mutation.target.classList.contains("crash-dialog")){
                 window.setTimeout( function() {
                    NavigationMap.crashset();
                      },800);
              }else if(mutation.target.classList.contains("icc")){
                 NavigationMap.inputset();
              }
            }
          }
        });
      });
      var config = {
        attributes: true
      };

      observer.observe(screen, config);
     },

    reset: function _reset() {
      this._controls = document.querySelectorAll(".menu-item");
      if (this._controls.length == 0){
        return;
      }
      var focused = document.querySelectorAll(".focus");
      if(focused.length > 0) {
        focused[0].classList.remove('focus');
      }

      var initial = this._controls[0];
      initial.classList.add('focus');

      initial.focus();
      window.focus();

      this.update();
    },

    crashset: function _reset() {
      this._controls = document.querySelectorAll("#always-report ,#crash-info-link");
      if (this._controls.length == 0){
        return;
      }
      var focused = document.querySelectorAll(".focus");
      if(focused.length > 0) {
        focused[0].classList.remove('focus');
      }

      var initial = this._controls[0];
      initial.classList.add('focus');

      initial.focus();
      window.focus();
      this.update();
    },
    inputset: function _reset() {
      this._controls = document.querySelectorAll("#icc-input-box");
      if (this._controls.length == 0){
        return;
      }
      var focused = document.querySelectorAll(".focus");
      if(focused.length > 0) {
        focused[0].classList.remove('focus');
      }
      var initial = this._controls[0];
      initial.classList.add('focus');

      initial.focus();
      window.focus();
    },
    update: function _update() {

      var i=0, id = 0;
      for(i=0; i<this._controls.length; i++) {
          this._controls[i].setAttribute('data-nav-id', id);
          this._controls[i].style.setProperty('--nav-left', id);
          this._controls[i].style.setProperty('--nav-right', id);
          this._controls[i].style.setProperty('--nav-down', id+1);
          this._controls[i].style.setProperty('--nav-up', id-1);
          id++;
      }
      //top element
      this._controls[0].style.setProperty('--nav-up', id-1);
      //bottom element
      this._controls[this._controls.length-1].style.setProperty('--nav-down', 0);
    },

    handleClick: function _handleClick(evt) {
      var cmasAlert = document.getElementById('notifications-lockscreen-cmas');
      if (!cmasAlert) {
        return;
      }
      if (!cmasAlert.hasAttribute('hidden')) {
        cmasAlert.click();
      } else {
        evt.target.click();
        for (var i = 0; i < evt.target.children.length; i++) {
          evt.target.children[i].click();
        }
      }
    }

  };
  exports.NavigationMap = NavigationMap;

})(window);
