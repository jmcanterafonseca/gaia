'use strict';

// Subscribe to changes in contacts datastores
// that the master contacts one, and send notifications
// to Contacts app to update it's data.
var ContactsProvider = (function ContactsProvider() {

  var stores;

  var init = function init() {
    if (!navigator.getDataStores) {
      return;
    }

    navigator.getDataStores('contacts').then(function(sts) {
      stores = sts;
      // TODO: filter any DS from contacts (be careful with FB DS)
      stores.forEach(function onStore(store) {
        store.onchange =  onStoreChange.bind(store);
      });
    });
  };

  // If a DS changed, tell Contacts App using IAC to perform the
  // updating process.
  // TODO: Known bug, this event is triggere as many times as
  // DS for contacts we have.
  function onStoreChange(evt) {
    console.log('------------------ DS CHANGE ----------------');
    /* jshint ignore:start */
    console.log('owner: ' + this.owner);
    /* jshint ignore:end */
    console.log('revision: ' + evt.revisionId);
    console.log('id: ' + evt.id);
    console.log('operation: ' + evt.operation);
  }

  return {
    init: init
  };

})();

ContactsProvider.init();
