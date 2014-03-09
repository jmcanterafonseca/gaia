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

var GCDSOps = (function GCDSOps() {

  var store = null;
  var DS_NAME = 'aggregated_contacts';

  var INDEX_ID = 1;
  var isIndexDirty = false;
  var index;

  var init = function init() {
    if (!navigator.getDataStores) {
      return Promise.reject(null);
    }
    if (store !== null) {
      return Promise.resolve(store);
    }

    var promise = new Promise(function(resolve, reject) {
      navigator.getDataStores(DS_NAME).then(function(stores) {
        store = stores[0];
        resolve(store);
      }, reject);
    });

    promise.then(loadIndex);

    return promise;
  };

  function createIndex() {
    return {
      // By tel number and all its possible variants
      // (We are not supporting dups right now)
      byTel: Object.create(null),
      // Prefix tree for enabling searching by partial tel numbers
      treeTel: [],
      // Will contain all the index of contacts that come from a
      // specific store, indexed by contact uid
      byStore: Object.create(null),
      // Also keep a reference by store and origina store id
      byOriginalStore: Object.create(null)
    };
  }

  function setIndex(obj) {
    index = (obj || createIndex());
  }

  function loadIndex() {
    return new Promise(function(resolve, reject) {
      store.get(INDEX_ID).then(function(idx) {
        isIndexDirty = false;
        setIndex(idx);
        resolve(idx);
      }, reject);
    });
  }

  function getContactIndex(contact, originStore) {
    return contact.uid + '_' + originStore.owner;
  }

  function indexByPhone(obj, idx) {
    if (Array.isArray(obj.tel)) {
      obj.tel.forEach(function(aTel) {
        var variants = SimplePhoneMatcher.generateVariants(aTel.value);

        variants.forEach(function(aVariant) {
          index.byTel[aVariant] = idx;
        });
        // To avoid the '+' char
        TelIndexer.index(index.treeTel, aTel.value.substring(1),
         idx);
      });
    }
  }

  function indexByStore(contact, originStore, idx, originalIndex) {
    if (!contact || !contact.uid || !originStore || !originStore.owner) {
      return;
    }
    // TODO: Investigate, do we need to index by original id, or just
    // keep an array of gcds ids by this store?
    var storeIndex = index.byStore[originStore.owner];
    var originalStoreIndex = index.byOriginalStore[originStore.owner];
    if (!storeIndex) {
      storeIndex = {};
      originalStoreIndex = {};
      index.byStore[originStore.owner] = storeIndex;
      index.byOriginalStore[originStore.owner] = originalStoreIndex;
    }

    storeIndex[contact.uid] = idx;
    if (originalIndex) {
      originalStoreIndex[originalIndex] = idx;
    }
  }

  var add = function add(obj, originStore, originIndex) {
    return new Promise(function(resolve, reject) {
      var key = getContactIndex(obj, originStore);
      var data = [{
        uid: obj.uid,
        origin: originStore.owner,
        origin_index: originIndex
      }];
      store.put(data, key).then(function() {
        indexByPhone(obj, key);
        indexByStore(obj, originStore, key, originIndex);
        isIndexDirty = true;
        console.log('Added contact at ' + key);
        resolve(data);
      }, reject);
    });
  };

  // Get a list of all contacts by this DS and perform
  // remove operations over it.
  var clear = function clear(originStore) {
    if (!index) {
      return Promise.reject();
    }

    var originalStoreIndex = index.byOriginalStore[originStore.owner];
    if (!originalStoreIndex) {
      return Promise.resolve();
    }

    var promises = [];
    Object.keys(originalStoreIndex).forEach(function onKey(key) {
      promises.push(remove(key, originStore));
    });

    return Promise.all(promises);
  };

  // Removes an entry, from the DS, and the index (original ds index)
  var remove = function remove(idx, originStore) {
    var globalIndex = index.byOriginalStore[originStore.owner][idx];
    if (!globalIndex) {
      return Promise.resolve();
    }

    return new Promise(function (resolve, reject) {
      store.get(globalIndex).then(function onEntry(entries) {
        if (!Array.isArray(entries)) {
          reject();
          return;
        }

        doRemove(entries, globalIndex, idx, originStore).then(resolve,
         reject);

      }, reject);
    });
  }

  // Remove one component from a contact. We have two cases, a contact
  // with a single component (direct), or a contact that is compound
  // by several entries
  //
  // @param entries Array of objects containing the components of a contact
  // @param globalIndex index of the global merged contact
  // @param localIndex index of the contact in the origin datastore
  // @param originStore Source datastore for the component we want remove
  function doRemove(entries, globalIndex, localIndex, originStore) {
    return new Promise(function (resolve, reject) {
      var position = -1;
      entries.forEach(function onEntry(entry, i) {
        if (entry.origin_index === localIndex) {
          position = i;
        }
      });

      // Remove from the array
      var uid = -1;
      if (position !== -1) {
        uid = entries[position].uid;
        entries.splice(position, 1);
      }

      // Remove indexes
      // TODO: Remove indexes by phone
      var storeIndex = index.byStore[originStore.owner];
      delete storeIndex[uid];
      if (Object.keys(storeIndex).length === 0) {
        delete index.byStore[originStore.owner];
      }
      var originStoreIndex = index.byOriginalStore[originStore.owner];
      delete originStoreIndex[localIndex];
      if (Object.keys(originStoreIndex).length === 0) {
        delete index.byOriginalStore[originStore.owner];
      }

      // Update entry
      isIndexDirty = true;
      if (entries.length === 0) {
        store.remove(globalIndex).then(resolve, reject);
      } else {
        store.put(entries, globalIndex).then(resolve, reject);
      }
    });
  }

  var flush = function flush() {
    if (!store) {
      return Promise.reject();
    }

    if (!isIndexDirty) {
      return Promise.resolve();
    }
    // Not really accurate
    isIndexDirty = false;
    return store.put(index, INDEX_ID);
  };

  return {
    init: init,
    add: add,
    remove: remove,
    flush: flush,
    clear: clear
  };

})();

window.GCDSOps = GCDSOps;
