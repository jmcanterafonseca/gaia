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
     *  Shows the curtain
     *
     *  @param {String} type
     *    Curtain type (wait, timeout, error, message and progress)
     *
     *  @param {String} from
     *    The origin of the message
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
    show: function(type, from, progress) {
      switch(type) {
        case 'wait':
          messages[type].textContent = _(type + capitalize(from));
          currentRequest.oncancel = function oncancel() {
            window.postMessage({ type: 'close', data: '' }, '*');
            Curtain.hide();
            parent.postMessage({ type: 'abort', data: '' }, '*');
          }

          break;

        case 'timeout':
          messages[type].textContent = _('timeout1', {
            from: _('timeout' + capitalize(from))
          });
          currentRequest.oncancel = function oncancel() {
            Curtain.hide();
            parent.postMessage({ type: 'abort', data: '' }, '*');
          }

          break;

        case 'error':
          messages[type].textContent = _('error1', {
            from: _(type + capitalize(from))
          });
          currentRequest.oncancel = function oncancel() {
            Curtain.hide();
            parent.postMessage({ type: 'abort', data: '' }, '*');
          }

          break;

        case 'message':
          messages[type].textContent = _(type + capitalize(from));
          break;

        case 'progress':
          messages[type].textContent = _(type + capitalize(from));
          progress.onchange = setProgressUI;
          setProgressUI(0);
          break;
      }

      return show(type);
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
