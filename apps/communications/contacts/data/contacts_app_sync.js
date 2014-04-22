/* global asyncStorage, Promise, GlobalMergedContacts */
/* exported ContactsSync */
'use strict';

var ContactsSync = (function ContactsSync() {

  var globalContactsStore = null;

  // Make sure the contacts stores are loaded
  function getGlobalDataStore() {
    return new Promise(function(resolve, reject) {
      if (globalContactsStore) {
        resolve(globalContactsStore);
        return;
      }

      if (!navigator.getDataStores) {
        reject({
          name: 'No datastores'
        });
      }

      navigator.getDataStores('Global_Contacts_Datastore').then(function(ds) {
        globalContactsStore = ds[0];
        resolve(globalContactsStore);
      });
    });
  }

  var onSync = function onSync(evt) {
    console.log('---> onSync invoked for contacts data --->')
    synchronizeData();
  };


  function endSync() {
    console.log('Local Contacts Manager: End Sync');
    setTimeout(window.close, 2000);
  }

  // We got a single change, apply it
  function applySingleChange(change) {
    return new Promise(function(resolve, reject) {
      switch (change.operation) {
        case 'update':
        break;

        case 'add':
          console.log('Going to add a record');
          if (!Array.isArray(change.data)) {
            console.log('It is not an Array');
            resolve();
            break;
          }
          MultiContact.getData({
            id: change.id,
            entryData: change.data
          }).then(function success(contactData) {
              console.log('Multicontact data: ', JSON.stringify(contactData));
              return ContactsData.save(contactData);
          }, function err(error) {
              console.log('Error while getting multicontact data: ', error.name);
          }).then(function success() {
              resolve();
          }, function error(err) { reject(error); });
        break;

        case 'clear':
          console.log('Going to clear all records from a store');
          ContactsData.clear().then(resolve, reject);
        break;

        case 'remove':
          console.log('Going to remove a record');
          if (!Array.isArray(change.data)) {
            resolve();
            break;
          }
          ContactsData.remove.then(resolve, reject);
        break;

        default:
          break;
      }
    });
  }

  function synchronizeData() {
    var cursor;

    function resolveCursor(task) {
      if (task.operation === 'done') {
        setLastRevision(endSync);
        return;
      }

      applySingleChange(task).then(function() {
        cursor.next().then(resolveCursor);
      }, function error(err) {
          console.error('Error while applying change: ', err);
          cursor.next().then(resolveCursor);
      });
    }

    getLastRevision(function(revisionId) {
      console.log('RevisionId: ', revisionId);

      getGlobalDataStore().then(function(store) {
        cursor = store.sync(revisionId);
        cursor.next().then(resolveCursor);
      });
    });
  }

  // Given the current store, gets last time we
  // perform a sync. If we never did, we will get a
  // null.
  function getLastRevision(done) {
    asyncStorage.getItem('GCDS_RevId', done);
  }

  // Save current DS revision as the last one
  // we sync.
  function setLastRevision(done) {
    asyncStorage.setItem('GCDS_RevId', globalContactsStore.revisionId,
      function() {
        setTimeout(done, 0);
    });
  }

  return {
    onSync: onSync
  };

})();

console.log('---> Loaded Contacts App Sync ---->');

navigator.mozSetMessageHandler('connection', function(connectionRequest) {
  console.log('Connection Request Local Contacts Sync');

  if (connectionRequest.keyword !== 'contactsLocalData-sync') {
    return;
  }

  console.log('Now going to sync ...');

  var port = connectionRequest.port;
  port.onmessage = function() {
    console.log('Message from the connection');
    ContactsSync.onSync();
  };
  port.start();

  console.log('Port started ...');
});
