'use strict';

var ContactsData = (function() {
  var DB_NAME = 'Local_Contacts_Database';
  var STORE_NAME = 'LocalContacts';
  var dbRequested = false;
  var DB_READY_EVENT = 'contacts_db_ready';

  var database;

  function createSchema(db) {
    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    // tore.createIndex()
  }


  function getDatabase() {
    return new Promise(function(resolve, reject) {
      if (database) {
        resolve(database);
        return;
      }

      if (dbRequested === true) {
        document.addEventListener(DB_READY_EVENT, function handler() {
          document.removeEventListener(DB_READY_EVENT, handler);
          resolve(database);
        });
      }

      dbRequested = true;
      var req = window.indexedDB.open('LocalContactsDatabase', 1.0);
      req.onupgradeneeded = function(e) {
        var db = e.target.result;
        createSchema(db);
      }

      req.onsuccess = function() {
        database = req.result;
        dbRequested = false;
        document.dispatchEvent(new CustomEvent(DB_READY_EVENT));
        resolve(database);
      }

      req.onerror = function() {
        database = null;
        reject(req.error);
      }
    });
  }

  function save(contact) {
    return new Promise(function(resolve, reject) {
      getDatabase().then(function(db) {
        console.log('Saving ....');
        var transaction = db.transaction([STORE_NAME], 'readwrite');
        var objectStore = transaction.objectStore(STORE_NAME);
        var req = objectStore.put(contact);
        req.onsuccess = function() {
          console.log('Record Saved!!!: ', contact.id);
          resolve();
        };
        req.onerror = reject;
      });
    });
  }

  function remove(id) {
    return new Promise(function(resolve, reject) {
      getDatabase().then(function(db) {
        console.log('Removing ....');

        var transaction = db.transaction([STORE_NAME], 'readwrite');
        var objectStore = transaction.objectStore(STORE_NAME);
        var req = objectStore.delete(id);
        req.onsuccess = function() {
          console.log('Record Removed: ', id);
          resolve();
        };
        req.onerror = reject;
      });
    });
  }

  function clear() {
    return new Promise(function(resolve, reject) {
      getDatabase().then(function(db) {
        console.log('Clearing ...');
        
        var transaction = db.transaction([STORE_NAME], 'readwrite');
        var objectStore = transaction.objectStore(STORE_NAME);
        var req = objectStore.clear();
        req.onsuccess = function() {
          console.log('Cleared!!!');
          resolve();
        };
        req.onerror = reject;
      });
    });
  }

  function getAll(args) {
    //code
  }

  return {
    'save': save,
    'remove': remove,
    'clear': clear,
    'getAll': getAll
  }
})();
