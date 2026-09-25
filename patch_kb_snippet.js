  // --- SimKeyboard Integration ---
  document.addEventListener('focusin', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      if (window.parent && window.parent.SimKeyboard) {
        window.parent.SimKeyboard.activate({
          type: function(ch) {
            var start = e.target.selectionStart;
            var end = e.target.selectionEnd;
            var val = e.target.value;
            e.target.value = val.substring(0, start) + ch + val.substring(end);
            e.target.selectionStart = e.target.selectionEnd = start + ch.length;
            e.target.dispatchEvent(new Event('input', { bubbles: true }));
          },
          backspace: function() {
            var start = e.target.selectionStart;
            var end = e.target.selectionEnd;
            var val = e.target.value;
            if (start === end && start > 0) {
              e.target.value = val.substring(0, start - 1) + val.substring(end);
              e.target.selectionStart = e.target.selectionEnd = start - 1;
            } else if (start !== end) {
              e.target.value = val.substring(0, start) + val.substring(end);
              e.target.selectionStart = e.target.selectionEnd = start;
            }
            e.target.dispatchEvent(new Event('input', { bubbles: true }));
          },
          getText: function() { return e.target.value; },
          moveCursor: function(dir) {
            var start = e.target.selectionStart;
            var newVal = start + dir;
            if (newVal < 0) newVal = 0;
            if (newVal > e.target.value.length) newVal = e.target.value.length;
            e.target.selectionStart = e.target.selectionEnd = newVal;
          }
        });
      }
    }
  });

  document.addEventListener('focusout', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      if (window.parent && window.parent.SimKeyboard) {
        window.parent.SimKeyboard.deactivate();
      }
    }
  });

  document.addEventListener('keydown', function(e) {
    if (window.parent && window.parent.SimKeyboard && window.parent.SimKeyboard.active) {
      var key = e.key;
      if (key === 'Escape') key = 'Backspace';
      if (window.parent.SimKeyboard.handleKeydown(key, e.repeat)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }, true);
  // ---------------------------------
