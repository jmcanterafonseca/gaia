'use strict';

var push = window.push || {};

(function() {
  window.console.log('Loading push notification page: ', parent.push);
  var ALLOWED_ORIGIN = 'app://communications.gaiamobile.org';

  var Messaging = push.messaging = {};

  Messaging.init = function() {
    if (navigator.mozHasPendingMessage('push')) {
      window.console.log('Push System Message Received!!!!!');
      navigator.mozSetMessageHandler('push', handlePush);
    }
    else if (navigator.mozHasPendingMessage('push-register')) {
      window.console.log('Push Register Message Received!!!!!');
      registerPush();
    }
    else if (parent.location === window.location) {
      window.console.log('Push woke up. Alarm ok. mozHasPendingMsg failed');
        window.setTimeout(function() {
          handlePush({});
        },0);
    }
    else {
      window.addEventListener('message', operationHandler);
    }
  };

  function operationHandler(e) {
    if (e.origin === ALLOWED_ORIGIN) {
      if (e.data.operation === 'register') {
        registerPush();
      }
      else if (e.data.operation === 'unregister') {
        unregisterPush(e.data.url);
      }
    }
  }

  function handlePush(message) {
    navigator.vibrate([200]);

    window.setTimeout(window.close, 300);
  }

  function registerPush() {
    if (!navigator.push) {
      throw new Error('No push API available on this device');
    }

    var req = navigator.push.register();

    req.onsuccess = function(e) {
      var endpoint = req.result;
      window.console.log('New URL endpoint: ', endpoint);

      var onregistered = parent.push.onregistered;
      // If we are out of iframe context then we call directly onregistered
      // This will only happens for push-register system messages
      if (parent.location === window.location) {
        onregistered = push.onregistered;
      }
      window.setTimeout(function() {
        onregistered(endpoint);
      }, 0);
    };

    req.onerror = function(e) {
      window.console.error('PUSH: Error getting a new endpoint: ',
                           req.error.name);
      var onregistrationerror = parent.push.onregistrationerror;
      if (parent.location === window.location) {
        onregistrationerror = push.onregistrationerror;
      }
      window.setTimeout(function() {
        onregistrationerror(req.error);
      }, 0);
    };
  }

  function unregisterPush(url) {
    window.console.log('Unregistering: ', url);

    if (!navigator.push) {
      throw new Error('No push API available on this device');
    }

    var req = navigator.push.unregister(url);

    req.onsuccess = function(e) {
      var onunregistered = parent.push.onunregistered;
      window.setTimeout(function() {
        onunregistered(url);
      }, 0);
    };

    req.onerror = function(e) {
      window.console.error('PUSH: Error unregistering: ', req.error.name);

      window.setTimeout(function() {
        parent.push.onregistrationerror(req.error);
      }, 0);
    };
  }

  Messaging.init();

})();
