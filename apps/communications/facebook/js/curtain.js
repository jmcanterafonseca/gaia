'use strict';

var Curtain = (function() {

  var _ = navigator.mozL10n.get;

  var curtainFrame = parent.document.querySelector('#fb-curtain');
  var doc = curtainFrame.contentDocument;
  var cancelButton = doc.querySelector('#cancel');
  var retryButton = doc.querySelector('#retry');

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
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  return {

    /**
     *  Shows the curtain
     *
     *  @param {String} type
     *    Curtain type (wait, timeout, error, message and progress).
     *
     *  @param {String} from
     *    The origin of the message.
     *
     *  @param {Object} progress
     *    Some curtains show a progress activity. This object defines a method
     *    called <onchange> that is executed when the value changes (0..100)
     *    so the curtain could be updated.
     *
     *  @return {Object} current request composed by two methods that will
     *                    be performed when user click on some button <oncancel>
     *                    or. <onretry>
     */
    show: function(type, from, progress) {
      from = capitalize(from);

      switch (type) {
        case 'wait':
          messages[type].textContent = _(type + from);
        break;

        case 'timeout':
          messages[type].textContent = _('timeout1', {
            from: _('timeout' + from)
          });
        break;

        case 'error':
          messages[type].textContent = _('error1', {
            from: _(type + from)
          });
        break;

        case 'message':
          messages[type].textContent = _(type + from);
        break;

        case 'progress':
          messages[type].textContent = _(type + from);
          progress.onchange = setProgressUI;
          setProgressUI(0);
        break;
      }

      show(type);
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
        if (typeof hiddenCB === 'function') {
          window.setTimeout(hiddenCB, 0);
        }
      });
    },

    set oncancel(cancelCb) {
      if (typeof cancelCb === 'function') {
        cancelButton.onclick = function on_cancel(e) {
          delete cancelButton.onclick;
          cancelCb();
          return false;
        };
      }
    },

    set onretry(retryCb) {
      if (typeof retryCb === 'function') {
        retryButton.onclick = function on_retry(e) {
          delete retryButton.onclick;
          retryCb();
          return false;
        };
      }
    }
  };

})();
