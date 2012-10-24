'use strict';

var Curtain = (function() {

  var currentRequest = {};

  var curtainFrame = parent.document.querySelector('#fb-curtain');

  curtainFrame.contentDocument.querySelector('#cancel').onclick =
    function oncancel() {
      if (currentRequest.oncancel) {
        currentRequest.oncancel();
      }

      return false;
    };

  curtainFrame.contentDocument.querySelector('#tryagain').onclick =
    function ontryagain(e) {
      if (currentRequest.ontryagain) {
        currentRequest.ontryagain();
      }

      return false;
  };

  var friendsImportProgress = curtainFrame.contentDocument.
        querySelector('#friendsImportProgress');
  var friendsImportProgressLabel = curtainFrame.contentDocument.
        querySelector('#friendsImportProgressLabel');

  function setProgressUI(value) {
    friendsImportProgressLabel.textContent = value + '%';
    friendsImportProgress.setAttribute('value', value);
  }

  var form = curtainFrame.contentDocument.querySelector('form');

  return {
    /**
     *  Shows an overlay
     *
     *  @param {String} type
     *    The type of the curtain that is defined in curtain.html and
     *    curtain.css. E.g. Errors, timeouts, imports, retrieving friends,
     *    linking contacts, etc...
     *
     *  @param {Object} progress
     *    Some curtains show a progress activity. This object defines a method
     *    called <onchange> that is executed when the value changes (0..100)
     *    so the curtain could be updated
     *
     *  @returns {Object} current request composed by two methods that will
     *                    be performed when user click on some button <oncancel>
     *                    or <ontryagain>
     */
    show: function c_show(type, progress) {
      form.dataset.state = type;
      if (progress) {
        setProgressUI(0);
        progress.onchange = setProgressUI;
      }
      curtainFrame.classList.add('visible');
      return currentRequest;
    },

    /**
     *  Hides the overlay
     *
     *  @param {Function} hiddenCB
     *    triggered when the curtain has been hidden.
     *
     */
    hide: function c_hide(hiddenCB) {
      delete form.dataset.state;
      curtainFrame.classList.remove('visible');
      curtainFrame.addEventListener('transitionend', function tend() {
        curtainFrame.removeEventListener('transitionend', tend);
        if (hiddenCB) {
          hiddenCB();
        }
      });
    }
  }

})();
