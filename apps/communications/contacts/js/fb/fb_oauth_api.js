'use strict';

var fb = window.fb || {};

if (typeof fb.oauthAPI === 'undefined') {
  (function() {

    var oauthAPI = fb.oauthAPI = {};
    var contactsAppOrigin = fb.oauthflow.params.contactsAppOrigin;

    function cancelCb() {
      Curtain.hide();

      parent.postMessage({
        type: 'abort',
        data: ''
      }, contactsAppOrigin);
    }

    oauthAPI.start = function(from) {
      fb.oauth.getAccessToken(function tokenReady(access_token) {
        Curtain.show('wait', from, {
          oncancel: cancelCb
        });

        parent.postMessage({
          type: 'authenticated',
          data: access_token
        }, contactsAppOrigin);
      }, from);
    }

    window.addEventListener('message', function messageHandler(e) {
      var data = e.data;

      if (data && data.type === 'start') {
        oauthAPI.start(data.data.from);
      }
    });
  })();
}
