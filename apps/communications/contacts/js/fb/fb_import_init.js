'use strict';

(function(document) {
  var isContactsMode = window.location.search.indexOf('contacts') === -1;
  
  function tokenReady(access_token) {

    // The curtain is only shown when we are launched from contacts
    if (isContactsMode) {
      Curtain.show('wait', 'friends');
    }

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

  if (isContactsMode) {
    window.addEventListener('message', function getAccessToken(e) {
      window.removeEventListener('message', getAccessToken);
      tokenReady(e.data.data);
    });

    parent.postMessage({
      type: 'messaging_ready',
      data: ''
    }, fb.CONTACTS_APP_ORIGIN);
  } else {
    fb.oauth.getAccessToken(tokenReady, 'friends');
  }

})(document);
