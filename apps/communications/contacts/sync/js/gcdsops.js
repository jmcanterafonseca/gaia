'use strict';


// Class for working with the Global Contacts DataStore (GCDS).
// This class will deal with the object keeped, that follow
// this structure:
// {
//    "tel": [<tel1>, <tel2>, <tel3>],
//    "contacts": [
//        {"store": <store manifest>, "uuid": <uuid in original store>},
//        { ... }
//    ]
// }
//
// Those object will have an unique id in the GCDS, but the first element
// of the GCDS will contain an object which keys will represent different
// indexes pointing to an index in the GCDS element.
// Current 'index', are:
//    by phone: 'urn:phone:123123123'
//    by user id in datastore: 'urn:mysource.org/manifest.webapp:uuid:2'
//    by datastore: 'urn:mysource.org'

var GCDSOps = (function GCDSOps() {
  // Define the URNs that we will use as indexes
  var byPhone = 'urn:phone:<phone>';
  var byOwnerUser = 'urn:owner:<owner>:uuid:<uuid>';
  var byOwner = 'urn:owner:<owner>';

  var gcds;
  var indexObject;

  var init = function(done, error) {
    if (!navigator.getDataStores) {
      if (typeof error === 'function') {
        error();
      }
      return;
    }

    navigator.getDataStores('aggregated_contacts').then(function(stores) {
      gcds = stores[0]; // TODO: check contacts ownership
      // Load the index in memory
      gcds.get(0).then(function(index) {
        indexObject = index;
        if (typeof done === 'function') {
          done(gcds);
        }
      }, error);
    }, error);
  };

  // Index building functions
  function getIndexByPhone(contact, phone) {
    var promise = new Promise(function(resolve, reject) {
      if (!phone && (!contact ||
        !contact.tel || contact.tel.length < 1 || !contact.tel[0].value)) {
        reject('No uuid');
      } else {
        var index = byPhone.replace('<phone>', phone || contact.tel[0].value);
        resolve(index);
      }
    });

    return promise;
  }

  function getIndexByOwnerUser(store, contact) {
    var promise = new Promise(function(resolve, reject) {
      if (!store || !store.owner || !contact || !contact.uuid) {
        reject('Invalid data');
      } else {
        var index = byOwnerUser.replace('<owner>', store.owner)
          .replace('uuid', contact.uuid);
        resolve(index);
      }
    });

    return promise;
  }

  function getIndexByOwner(store) {
    var promise = new Promise(function(resolve, reject) {
      if (!store || !store.owner) {
        reject('Invalid data');
      } else {
        var index = byOwner.replace('<owner>', store.owner);
      }
    });

    return promise;
  }

  // Search the index object
  var find = function(index) {
    var promise = new Promise(function(resolve, reject) {
      if (!index || !gcds || !indexObject || !indexObject[index]) {
        reject();
      } else {
        resolve(indexObject[index]);
      }
    });

    return promise;
  };

  // Saves the index object into the DS
  function saveIndex() {
    var promise = new Promise(function(resolve, reject) {
      if (!gcds || !indexObject) {
        reject('Not initialized');
      } else {
        gcds.put(indexObject, 0).then(resolve, reject);
      }
    });

    return promise;
  }

  // Clear a contact datasource
  var clear = function clear(store) {
    getIndexByOwner(store).then(function (index) {
      return find(index);
    }).then(function (listOfIndex) {
      return cleanByIndex(listOfIndex);
    }).then(function ());
  };

  // Given index in the GCDS it removes all of them
  function cleanByIndex(indexes) {
    if (!indexes || !Array.isArray(indexes)) {
      return Promise.reject('Invalid list of indexes')
    }
    var promises = [];
    indexes.forEach(function onIndex(index) {
      promises.push(gcds.remove(index));
    });

    return Promise.all(promises);
  }

  return {
    init: init,
    get isInitialised() {
      return gcds !== null;
    },
    find: find,
    clear: clear
  };

})();

window.GCDSOps = GCDSOps;
