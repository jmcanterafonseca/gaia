'use strict';

var push = window.push || {};

(function() {
  var PUSH_STATUS_KEY = 'pushStatus';
  var FB_UID_KEY = 'ownFbUid';
  var TOKEN_KEY = 'tokenData';

  var savedCallbacks;

  var pushFrame;
  var ALLOWED_ORIGIN = 'app://communications.gaiamobile.org';

  var APP_SERVER_URL = 'http://fbowdpush-firefoxos.rhcloud.com';
  var REGISTER_CMD = 'register_url';
  var UNREGISTER_CMD = 'unregister_url';

  // Delay in closing the iframe that registers the push.
  // Avoiding console.log issues in the logcat
  var DELAY_PUSH_FRAME = 5000;

  // Method to be called to perform the registration
  push.register = function(callbacks) {
    savedCallbacks = callbacks;

    window.asyncStorage.getItem(PUSH_STATUS_KEY, function(data) {
      // Check whether the URL was already sent to the app server or not
      if (!data || !data.url) {
        window.console.log('Launching full registration process');
        registerPush();
      }
      else if (!data.sentToAppServer) {
        window, console.log('URL not already sent to app server');
        push.onregistered(data.url);
      }
      else {
        if (typeof callbacks.success === 'function') {
          window.console.log('Registration already done');
          callbacks.success();
        }
      }
    });
  };

  push.unregister = function(callbacks) {
    savedCallbacks = callbacks;

    window.asyncStorage.getItem(PUSH_STATUS_KEY, function(data) {
      if (!data) {
        if (typeof savedCallbacks.success === 'function') {
          savedCallbacks.success();
          return;
        }
      }
      if (data.url) {
        unregisterPush(data.url);
      }
    });
  };


  function successCbRegistered(url) {
    // Now it has been registered to the app server
    markRegistrationStatus(url, true);
    if (typeof savedCallbacks.success === 'function') {
      savedCallbacks.success();
    }
  }


  function cleanPushFrame() {
    pushFrame.src = null;
    document.body.removeChild(pushFrame);
    pushFrame = null;
  }

  // Method invoked from the iframe that performs the push API registration
  push.onregistered = function(url) {
    if (pushFrame) {
      window.setTimeout(cleanPushFrame, DELAY_PUSH_FRAME);
    }
    // Here we only save the URL obtained but at this time it has not been
    // registed to our application server
    markRegistrationStatus(url, false);

    // The rest of operations depend on having network connection
    if (navigator.offLine === true) {
      savedCallbacks.error({name: 'DEVICE_OFFLINE'});
      return;
    }

    var appServerCallbacks = {
      success: function() {
        successCbRegistered(url);
      },
      error: savedCallbacks.error,
      timeout: savedCallbacks.timeout
    };

    window.asyncStorage.getItem(FB_UID_KEY, function(uid) {
      if (uid) {
        window.console.log('Facebook UID already available: ', uid);
        registerInAppServer(url, uid, appServerCallbacks);
      }
      else {
        window.asyncStorage.getItem(TOKEN_KEY, function(data) {
          if (data && data.access_token) {
            window.console.log('Access token: ', data.access_token);
            var callbacks = {
              success: function(uid) {
                saveFbUid(uid);
                registerInAppServer(url, uid, appServerCallbacks);
              },
              error: savedCallbacks.error,
              timout: savedCallbacks.timeout
            };
            getFbUid(data.access_token, callbacks);
          }
          else {
            window.console.error('No access token for FB found!');
            if (typeof savedCallbacks.error === 'function') {
              savedCallbacks.error({ name: 'NO_ACCESS_TOKEN' });
            }
          }
        });
      }
    });
  };

  push.onunregistered = function(url) {
    window.console.log('Onunregistered Callback invoked!!!');

    window.asyncStorage.getItem(FB_UID_KEY, function(uid) {
      if (uid) {
        unregisterInAppServer(url, uid, savedCallbacks);
      }
      else {
        window.console.warn('PUSH: No UID found for unregistering');
      }

      window.asyncStorage.removeItem(PUSH_STATUS_KEY);
      window.asyncStorage.removeItem(FB_UID_KEY);
    });
  };


  push.onregistrationerror = function(error) {
    window.console.error('Error while doing push registration: ', error);
    if (typeof savedCallbacks.error === 'function') {
      savedCallbacks.error(error);
    }
  };


  function markRegistrationStatus(url, sentToAppServer) {
    window.asyncStorage.setItem(PUSH_STATUS_KEY, {
      url: url,
      sentToAppServer: sentToAppServer
    });
  }

  function saveFbUid(uid) {
    window.asyncStorage.setItem(FB_UID_KEY, uid);
  }

  function iframeLoad(message) {
    // The push has to be scheduled by the same page that will handle it
      // https://bugzilla.mozilla.org/show_bug.cgi?id=800431
      pushFrame = document.createElement('iframe');
      pushFrame.onload = function() {
        pushFrame.contentWindow.postMessage(message, ALLOWED_ORIGIN);
      };
      pushFrame.src = '/facebook/fb_push.html';
      pushFrame.width = 1;
      pushFrame.height = 1;
      pushFrame.style.display = 'none';
      document.body.appendChild(pushFrame);
  }

  function registerPush() {
    window.setTimeout(function() {
      iframeLoad({
        operation: 'register'
      });
    },0);
  }

  function unregisterPush(url) {
    window.setTimeout(function() {
      iframeLoad({
        operation: 'unregister',
         url: url
      });
    },0);
  }

  function sendToServer(resource, pushUrl, uid, cbs) {
    var xhr = new XMLHttpRequest({
      mozSystem: true
    });

    xhr.open('POST', APP_SERVER_URL + '/' + resource, true);
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.responseType = 'text';

    xhr.onload = function() {
      if (xhr.status === 200 || xhr.status === 0) {
        window.console.log('Successfully contacted app server for: ', pushUrl);
        if (typeof cbs.success === 'function') {
          cbs.success();
        }
      }
      else {
        window.console.error('Error while calling app server: ',
                             resource, xhr.status);
        if (typeof cbs.error === 'function') {
          cbs.error({name: 'SERVER_ERROR'});
        }
      }
    };

    xhr.onerror = function(e) {
      window.console.error('Error while registering URI ', e.name);

      if (typeof cbs.error === 'function') {
        cbs.error(xhr.error.name);
      }
    };

    xhr.ontimeout = function() {
      window.console.error('Timeout while sending the URL to the App Server');

      if (typeof cbs.timeout === 'function') {
        cbs.timeout();
      }
    };

    xhr.send(JSON.stringify({
      uid: uid,
      url: pushUrl
    }));
  }


  function registerInAppServer(pushUrl, uid, cbs) {
    sendToServer(REGISTER_CMD, pushUrl, uid, cbs);
  }


  function unregisterInAppServer(pushUrl, uid, cbs) {
    window.console.log('!!!! Unregister in app server !!!!');
    sendToServer(UNREGISTER_CMD, pushUrl, uid, cbs);
  }


  function getFbUid(access_token, cbs) {
    window.console.log('Going to obtain the UID');
    var xhr = new XMLHttpRequest({
      mozSystem: true
    });

    xhr.open('GET', 'https://graph.facebook.com/me?access_token=' +
             access_token, true);
    xhr.responseType = 'json';

    xhr.onload = function() {
      if (xhr.status === 200 || xhr.status === 0) {
        window.console.log('UID ready' + xhr.response.id);

        var userUid = xhr.response.id;
        window.console.log('Facebook UID: ', userUid);
        if (typeof cbs.success === 'function') {
           cbs.success(userUid);
        }
      }
    };

    xhr.onerror = function(e) {
      window.console.error('Error while retrieving FB UID ', e.name);
      if (typeof cbs.error === 'function') {
        cbs.error(xhr.error);
      }
    };

    xhr.ontimeout = function(e) {
      window.console.error('Timeout while getting FB UID');
      if (typeof cbs.timeout === 'function') {
        cbs.timeout();
      }
    };

    xhr.send();
  }

})();
