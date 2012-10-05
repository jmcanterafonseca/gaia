'use strict';

utils.listeners.add({
  '#import-close': fb.importer.ui.end,
  '#import-action': fb.importer.ui.importAll,
  '#select-all': fb.importer.ui.selectAll,
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

fb.contacts.init(function fb_init() {
  fb.importer.ui.init();
  fb.importer.ui.getFriends();
});

window.addEventListener('localized', function initContacts(evt) {
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;
});
