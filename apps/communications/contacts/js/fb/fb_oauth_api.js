'use strict';

var fb = window.fb || {};

if (typeof fb.oauthAPI === 'undefined') {
  (function() {

    var oauthAPI = fb.oauthAPI = {};

    window.console.log('Oauth API loaded');

    oauthAPI.start = function(from) {
      fb.oauth.getAccessToken(function tokenReady(access_token) {
        Curtain.show('wait', from);
        parent.postMessage({
          type: 'authenticated',
          data: access_token
        }, '*');
      }, from);
    }

    window.addEventListener('message', function messageHandler(e) {
      var data = e.data;

      window.console.log('PostMessage got',JSON.stringify(data));

      if (data && data.type === 'start') {
        oauthAPI.start(data.data.from);
      }
    });
  })();
}
