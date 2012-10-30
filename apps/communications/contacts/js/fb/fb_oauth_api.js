'use strict';

var fb = window.fb || {};

if (typeof fb.oauthAPI === 'undefined') {
  (function() {

    var oauthAPI = fb.oauthAPI = {};

    oauthAPI.start = function(from) {
      fb.oauth.getAccessToken(function tokenReady(access_token) {
        Curtain.show('wait', from);

        parent.postMessage({
          type: 'authenticated',
          data: access_token
        }, fb.oauthflow.params.contactsAppOrigin);
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
