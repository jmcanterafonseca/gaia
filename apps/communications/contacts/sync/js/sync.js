/* global asyncStorage, Promise, GlobalMergedContacts */
/* exported ContactsSync */
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
    }).then(GlobalMergedContacts.init).then(function() {
      if (typeof cb === 'function') {
        cb();
      }
    });
  }

  var onSync = function onSync(evt) {
    var message = evt.data;
    console.log('On Sync invoked', JSON.stringify(message));
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
    if (!store || !change || !change.operation) {
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
    console.log('GCDS ::: Sync done');
    window.close();
  }

  // We got a single change, apply it
  function applySingleChange(store, change) {
    console.log('---->> op ', JSON.stringify(change), store);
    switch (change.operation) {
      case 'update':
      break;
      case 'add':
        console.log('Going to add a record');
        return GlobalMergedContacts.add(store, change.id, change.data);
      case 'clear':
        console.log('Going to clear all records from a store');
        return GlobalMergedContacts.clear(store);
      case 'remove':
        console.log('Going to remove a record');
        return GlobalMergedContacts.remove(store, change.id);
      default:
      break;
    }

    return Promise.resolve();
  }

  function applySync(store) {
    getLastRevision(store, function(revisionId) {
      console.log('RevisionId: ', revisionId);

      var cursor = store.sync(revisionId);
      function resolveCursor(task) {
        if (task.operation === 'done') {
          GlobalMergedContacts.flush().then(function() {
            setLastRevision(store, endSync);
          });
          return;
        }
        // applySingleChange(store, task).
        //   then(cursor.next).
        //   then(resolveCursor);
        applySingleChange(store, task).then(function() {
          cursor.next().then(resolveCursor);
        }, function error(err) {
            console.error('Error while applying change: ', err);
            cursor.next().then(resolveCursor);
        });
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
    asyncStorage.setItem(store.owner, store.revisionId, function() {
      // We cannnot execute the done (window.close) sequentially
      // otherwise we get the following error:
      // [JavaScript Error: "IndexedDB UnknownErr: IDBTransaction.cpp:863"]
      setTimeout(done, 1000);
    });
  }

  return {
    onSync: onSync
  };

})();

navigator.mozSetMessageHandler('connection', function(connectionRequest) {
  if (connectionRequest.keyword !== 'contacts-sync') {
    return;
  }

  console.log('Connection Request for Syncing');

  var port = connectionRequest.port;
  port.onmessage = ContactsSync.onSync;
  port.start();
});
