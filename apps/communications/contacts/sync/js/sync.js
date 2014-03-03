'use strict';

var ContactsSync = (function ContactsSync() {

  var onSync = function onSync(evt) {
    var message = evt.data;
    applyChange(message);
  };

  function applyChange(message) {
    var owner = message.owner;
    findStore(owner, function(store) {
      if (!store) {
        return;
      }

      doApplyChanges(store, message);
    });
  }

  function findStore(owner, cb) {
    navigator.getDataStores('contacts').then(function(stores) {
      var result = null;
      stores.forEach(function onStore(store) {
        if (store.owner === owner) {
          result = store;
        }
      });
      cb(result);
    });
  }

  function doApplyChanges(store, change) {
    console.log('Have to apply change: ' + JSON.stringify(change));
    // Since there is a bug in datastore that launch event changes
    // in all DS of the same kind, use the cursor with the
    // revision.
    // Unfortunately, the revisionId parameter to ask for the cursor
    // is being ignored if it's incorrect :(
  }

  return {
    onSync: onSync
  };

})();

navigator.mozSetMessageHandler('connection', function(connectionRequest) {
  if (connectionRequest.keyword !== 'contacts-sync') {
    return;
  }

  var port = connectionRequest.port;
  port.onmessage = ContactsSync.onSync;
  port.start();
});
