'use strict';

var Curtain = (function() {

  var currentRequest = {};

  var _ = navigator.mozL10n.get;

  var curtainFrame = parent.document.querySelector('#fb-curtain');

  var doc = curtainFrame.contentDocument;
  doc.querySelector('#cancel').onclick = function oncancel() {
    if (currentRequest.oncancel) {
      currentRequest.oncancel();
    }

    return false;
  };

  doc.querySelector('#tryagain').onclick = function ontryagain(e) {
    if (currentRequest.ontryagain) {
      currentRequest.ontryagain();
    }

    return false;
  };

  var progressElement = doc.querySelector('#progressElement');
  var progressLabel = doc.querySelector('#progressLabel');

  function setProgressUI(value) {
    progressLabel.textContent = value + '%';
    progressElement.setAttribute('value', value);
  }

  var form = doc.querySelector('form');

  var messages = [];
  var elements = ['error', 'timeout', 'wait', 'message', 'progress'];
  elements.forEach(function createElementRef(name) {
    messages[name] = doc.getElementById(name + 'Msg');
  });

  function show(type) {
    form.dataset.state = type;
    curtainFrame.classList.add('visible');
    return currentRequest;
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  return {

    /**
     *  Shows a progress activity
     *
     *  @param {String} from
     *    The origin of the message
     *
     *  @param {Object} progress
     *    Some curtains show a progress activity. This object defines a method
     *    called <onchange> that is executed when the value changes (0..100)
     *    so the curtain could be updated
     *
     *  @returns {Object} empty current request
     */
    progress: function c_progress(from, progress) {
      messages['progress'].textContent = _('progress' + capitalize(from));
      progress.onchange = setProgressUI;
      setProgressUI(0);
      return show('progress');
    },

    /**
     *  Shows a timeout card
     *
     *  @param {String} from
     *    The origin of the timeout
     *
     *  @returns {Object} current request composed by two methods that will
     *                    be performed when user click on some button <oncancel>
     *                    or <ontryagain>
     */
    timeout: function c_timeout(from) {
      messages['timeout'].textContent = _('timeout1', {
        from: _('timeout' + capitalize(from))
      });
      return show('timeout');
    },

    /**
     *  Shows an error card
     *
     *  @param {String} from
     *    The origin of the error
     *
     *  @returns {Object} current request composed by two methods that will
     *                    be performed when user click on some button <oncancel>
     *                    or <ontryagain>
     */
    error: function c_error(from) {
      messages['error'].textContent = _('error1', {
        from: _('error' + capitalize(from))
      });
      return show('error');
    },

    /**
     *  Shows a waiting card
     *
     *  @param {String} from
     *    The origin of the timeout
     *
     *  @returns {Object} current request composed by one method that will
     *                    be performed when user click on <oncancel>
     */
    wait: function c_wait(from) {
      messages['wait'].textContent = _('wait' + capitalize(from));
      return show('wait');
    },

    /**
     *  Shows a message
     *
     *  @param {String} from
     *    The origin of the message
     *
     *  @returns {Object} empty current request
     */
    message: function c_message(from) {
      messages['message'].textContent = _('message' + capitalize(from));
      return show('message');
    },

    /**
     *  Hides the curtain
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
