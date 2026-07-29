/**
 * PageTransitions provides transition functions used when navigating panels.
 *
 * @module PageTransitions
 */

define([],function() { //eslint-disable-line
  const sendPanelReady = function sendPanelReady(oldPanelHash, newPanelHash) {
    const detail = {
      previous: oldPanelHash,
      current: newPanelHash
    };
    const event = new CustomEvent('panelready', { detail });
    window.dispatchEvent(event);
  };

  return {
    /**
     * Typically used with phone size device layouts.
     *
     * @alias module:PageTransitions#oneColumn
     * @param {String} oldPanel
     * @param {String} newPanel
     * @param {Function} callback
     */
    oneColumn: function oneColumn(oldPanel, newPanel, callback) {
      if (oldPanel === newPanel) {
        callback();
        return;
      }

      // Switch previous/current classes
      if (oldPanel) {
        oldPanel.className = newPanel.className ? '' : 'previous';
      }
      if (newPanel.className === 'current') {
        sendPanelReady(oldPanel && `#${oldPanel.id}`, `#${newPanel.id}`);

        if (callback) {
          callback();
        }
        return;
      }

      newPanel.className = 'current';

      /**
       * Most browsers now scroll content into view taking CSS transforms into
       * account.  That's not what we want when moving between <section>s,
       * because the being-moved-to section is offscreen when we navigate to its
       * #hash.  The transitions assume the viewport is always at document 0,0.
       * So add a hack here to make that assumption true again.
       * https://bugzilla.mozilla.org/show_bug.cgi?id=803170
       */
      if (window.scrollX !== 0 || window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }

      window.setTimeout(() => {
        if (oldPanel) {
          sendPanelReady(`#${oldPanel.id}`, `#${newPanel.id}`);
          if (oldPanel.className === 'current') {
            return;
          }
        } else {
          sendPanelReady(null, `#${newPanel.id}`);
        }
        if (callback) {
          callback();
        }
      }, 100);
    },

    /**
     * Typically used with tablet size device layouts.
     *
     * @alias module:PageTransitions#twoColumn
     * @param {String} oldPanel
     * @param {String} newPanel
     * @param {Function} callback
     */
    twoColumn: function twoColumn(oldPanel, newPanel, callback) {
      if (oldPanel === newPanel) {
        callback();
        return;
      }

      if (oldPanel) {
        oldPanel.className = newPanel.className ? '' : 'previous';
        newPanel.className = 'current';
        sendPanelReady(`#${oldPanel.id}`, `#${newPanel.id}`);
      } else {
        newPanel.className = 'current';
        sendPanelReady(null, `#${newPanel.id}`);
      }

      if (callback) {
        callback(); //eslint-disable-line
      }
    }
  };
});
