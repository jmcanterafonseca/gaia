/* global asyncStorage, Promise, GCDSOps */
'use strict';

var ContactsSync = (function ContactsSync() {

  var stores = {};

  // Make sure the contacts stores are loaded
  function ensureStores(cb) {
    if (!navigator.getDataStores) {
      if (typeof cb === 'function') {
        cb('No DS available');
      }
      return;
    }

    stores = {};
    navigator.getDataStores('contacts').then(function(ds) {
      ds.forEach(function onStore(store) {
        stores[store.owner] = store;
      });
      return Promise.resolve();
    }).then(GCDSOps.init).then(function() {
      if (typeof cb === 'function') {
        cb();
      }
    });
  }

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
    ensureStores(function() {
      var result = stores[owner] || null;
      if (typeof cb === 'function') {
        cb(result);
      }
    });
  }

  function doApplyChanges(store, change) {
    // Since there is a bug in datastore that launch event changes
    // in all DS of the same kind, use the cursor with the
    // revision.
    // Unfortunately, the revisionId parameter to ask for the cursor
    // is being ignored if it's incorrect :(
    if (!store || !change || !change.id || !change.operation) {
      // Do nothing
      return;
    }

    // if (change.multipe) {
    //   applySync(store);
    // } else {
    //   applySingleChange(store, change);
    // }
    applySync(store);
  }

  function endSync() {
    window.close();
  }

  // We got a single change, apply it
  function applySingleChange(store, change) {
    switch (change.operation) {
      case 'update':
      break;
      case 'add':
        GCDSOps.add(change.data, store);
      break;
      case 'clear':
      break;
      default:
      break;
    }
  }

  function applySync(store) {
    getLastRevision(store, function(revisionId) {
      var cursor = store.sync(revisionId);
      function resolveCursor(task) {
        if (task.operation === 'done') {
          setLastRevision(store, endSync);
          return;
        }
        applySingleChange(store, task);
        cursor.next().then(resolveCursor);
      }
      cursor.next().then(resolveCursor);
    });
  }

  // Given the current store, gets last time we
  // perform a sync. If we never did, we will get a
  // null.
  function getLastRevision(store, done) {
    asyncStorage.getItem(store.owner, done);
  }

  // Save current DS revision as the last one
  // we sync.
  function setLastRevision(store, done) {
    asyncStorage.setItem(store.owner, store.revisionId, done);
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
