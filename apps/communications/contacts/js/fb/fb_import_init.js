'use strict';

(function(document) {
  function tokenReady(access_token) {
    Curtain.show('wait', 'friends');

    if(document.readyState === 'complete') {
      onLoad(access_token);
    }
    else {
      window.addEventListener('load', function do_load() {
        onLoad(access_token);
        window.removeEventListener('load',do_load);
      });
    }
  }


  function onLoad(access_token) {
    utils.listeners.add({
      '#import-close': fb.importer.ui.end,
      '#import-action': fb.importer.ui.importAll,
      '#cancel-search': contacts.Search.exitSearchMode,
      '#search-contact': [
        {
          event: 'focus',
          handler: contacts.Search.enterSearchMode
        },
        {
          event: 'keyup',
          handler: contacts.Search.search
        }
      ]
    });

    // This is done through onclick as it is going to be changed it dynamically
    document.querySelector('#select-all').onclick = fb.importer.ui.selectAll;

    fb.contacts.init(function fb_init() {
      fb.importer.ui.init();
      fb.importer.start(access_token);
    });
  }

  window.addEventListener('localized', function fb_localized(evt) {
    document.documentElement.lang = navigator.mozL10n.language.code;
    document.documentElement.dir = navigator.mozL10n.language.direction;
  });

  fb.oauth.getAccessToken(tokenReady, 'friends');

})(document);





