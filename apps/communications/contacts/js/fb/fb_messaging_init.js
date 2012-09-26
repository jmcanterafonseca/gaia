'use strict';

var cid = window.location.search.substring(fb.msg.CID_PARAM.length + 2);

// Module fb.contacts is initialized just in case we need it
fb.contacts.init(function fb_init() {
  fb.msg.ui.init(cid);
});

window.addEventListener('localized', function initContacts(evt) {
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;
});
