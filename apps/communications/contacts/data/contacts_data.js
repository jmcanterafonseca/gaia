'use strict';

var ContactsData = (function() {
  var DB_NAME = 'Local_Contacts_Database';
  var STORE_NAME = 'LocalContacts';

  var INDEX_BY_NAME          = 'by_name';
  var INDEX_BY_GN            = 'by_givenName';
  var INDEX_BY_FN            = 'by_familyName';

  var INDEX_BY_TEL           = 'by_tel';
  var INDEX_BY_EMAIL         = 'by_email';
  var INDEX_BY_MULTI_CONTACT = 'by_multi_contact';

  var dbRequested = false;
  var DB_READY_EVENT = 'contacts_db_ready';

  var database;

  function normalizeName(str) {
    if (!str || !str.trim()) {
      return '';
    }

    var out = Normalizer.toAscii(str.toLowerCase());

    console.log('normalized Value: ', out);

    return out;
  }

  function normalizeData(contact) {
    var nameFields = ['name', 'givenName', 'familyName'];
    var valueTypeFields = ['email', 'tel'];

    nameFields.forEach(function(aField) {
      var value = Array.isArray(contact[aField]) && contact[aField][0];
      contact[aField + '1'] = normalizeName(value);
    });

    valueTypeFields.forEach(function(aField) {
      if(!Array.isArray(contact[aField])) {
        return;
      }

      contact[aField + '1'] = [];
      contact[aField].forEach(function(fieldData) {
        if(fieldData && fieldData.value) {
          contact[aField + '1'].push(fieldData.value);
        }
      });
    });
  }

  function createSchema(db) {
    if (db.objectStoreNames.contains(STORE_NAME)) {
      db.deleteObjectStore(STORE_NAME);
    }

    var store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });

    store.createIndex(INDEX_BY_NAME, 'name1', {
      unique: false,
      multiEntry: true
    });

    store.createIndex(INDEX_BY_GN, 'givenName1', {
      unique: false
    });

    store.createIndex(INDEX_BY_FN, 'familyName1', {
      unique: false
    });

    store.createIndex(INDEX_BY_TEL, 'tel1', {
      unique: false,
      multiEntry: true
    });

    store.createIndex(INDEX_BY_EMAIL, 'email1', {
      unique: false,
      multiEntry: true
    });

    store.createIndex(INDEX_BY_MULTI_CONTACT, 'multiContactId', {
      unique: true
    });
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
        console.log('Saving ....', contact.id);
        var transaction = db.transaction([STORE_NAME], 'readwrite');
        var objectStore = transaction.objectStore(STORE_NAME);

        normalizeData(contact);
        var req = objectStore.put(contact);

        req.onsuccess = function() {
          console.log('Record Saved!!!: ', contact.id);
          resolve();
        };
        req.onerror = function() {
          console.error('Error: ', req.error.name);
          reject(req.error);
        };
      });
    });
  }

  function get(id) {
    return new Promise(function(resolve, reject) {
      getDatabase().then(function(db) {
        console.log('Getting by id ....', id);

        var transaction = db.transaction([STORE_NAME], 'readonly');
        var objectStore = transaction.objectStore(STORE_NAME);
        var req = objectStore.get(id);

        req.onsuccess = function() {
          console.log('Record obtained: ', id);
          console.log(JSON.stringify(req.result));
          resolve(req.result);
        };

        req.onerror = reject;
      });
    });
  }

  function getMultiContact(multiContactId) {
    return new Promise(function(resolve, reject) {
      getDatabase().then(function(db) {
        console.log('Getting multicontact by id ....', multiContactId);

        var transaction = db.transaction([STORE_NAME], 'readonly');
        var objectStore = transaction.objectStore(STORE_NAME);
        var index = objectStore.index(INDEX_BY_MULTI_CONTACT);

        var req = index.get(multiContactId);
        req.onsuccess = function() {
          console.log('Record by multicontact obtained: ', multiContactId);
          console.log(JSON.stringify(req.result));
          resolve(req.result);
        };

        req.onerror = reject;
      });
    });
  }

  function remove(id) {
    return new Promise(function(resolve, reject) {
      getDatabase().then(function(db) {
        console.log('Removing ....', id);

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

  function findBy(field, strToFind) {
    console.log('Find by: ', field, strToFind);

    if (!field || !strToFind || !field.trim() || !strToFind.trim()) {
      return Promise.resolve([]);
    }

    return new Promise(function(resolve, reject) {
      getDatabase().then(function(db) {
        console.log('Find by ...', field, strToFind);
        var transaction = db.transaction([STORE_NAME], 'readonly');
        var objectStore = transaction.objectStore(STORE_NAME);
        var indexName = 'by' + '_' + field;
        var index = objectStore.index(indexName);

        if (field === 'name' || field === 'givenName'
            || field === 'familyName') {
          strToFind = normalizeName(strToFind);
        }

        var request = index.openCursor(IDBKeyRange.only(strToFind));
        var resultArray = [];
        request.onsuccess = function() {
          var cursor = request.result;
          console.log('Cursor: ', cursor);
          if (cursor) {
            // Called for each matching record.
            resultArray.push(cursor.value);
            cursor.continue();
          } else {
              resolve(resultArray);
          }
        };
      });
    });
  }

  // Returns a cursor that allows to iterate over all contacts stored
  function getAll(args) {
    return new Cursor();
  }

  function Cursor() {
    var self = this;

    Object.defineProperty(this, 'onsuccess', {
      set: function(cb) {
        getDatabase().then(function(db) {
          var transaction = db.transaction([STORE_NAME], 'readonly');
          var objectStore = transaction.objectStore(STORE_NAME);
          self.idbIndex = objectStore.index(INDEX_BY_NAME);
          var req = self.idbIndex.openCursor();

          console.log('After opening cursor');

          req.onsuccess = function(evt) {
            self.cursor = evt.target.result;

            console.log('cursor: ', self.cursor && self.cursor.value.id);

            if (typeof cb === 'function') {
              cb({
                target: {
                  result: self.cursor && self.cursor.value
                }
              });
            }
          }

          req.onerror = function() {
            alert('error while opening cursor');
          }
        });
      }
    });

    this.continue = function() {
      this.cursor.continue();
    }
  }

  return {
    'get': get,
    'getMultiContact': getMultiContact,
    'save': save,
    'remove': remove,
    'clear': clear,
    'getAll': getAll,
    'findBy': findBy
  }
})();
