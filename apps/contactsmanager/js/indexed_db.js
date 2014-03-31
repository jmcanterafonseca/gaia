'use strict';

function createDB() {
  var req = window.indexedDB.open('DB', 1.0);

  var STORE_NAME = 'theStore';

  req.onupgradeneeded = function(e) {
    var db = e.target.result;
    createSchema(db);
  };

  req.onsuccess = function() {
    var db = req.result;
  };

  req.onerror = function() {
    console.error('Error while getting Database: ', req.error &&
                  req.error.name);
  };
}

function createSchema() {
  if (db.objectStoreNames.contains(STORE_NAME)) {
    db.deleteObjectStore(STORE_NAME);
  }

  var store = db.createObjectStore(STORE_NAME, { keyPath: 'suffix' });
}

function insertIndexData(db, indexData) {
  var trans = db.transaction([STORE_NAME], 'readwrite');

  var store = transaction.objectStore(STORE_NAME);

  var suffixHashArray = [];
  Object.keys(indexData.suffixHash).forEach(function(aKey) {
    suffixHashArray.push({
      suffix: aKey,
      data: indexData.suffixHash[aKey]
    });
  });

  trans.oncomplete = function() {
    console.log('Index written to DB');
  }

  trans.onerror = function() {

  }
}
