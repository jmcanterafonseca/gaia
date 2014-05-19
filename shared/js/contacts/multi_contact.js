'use strict';

var MultiContact = (function() {
  var datastores = Object.create(null);
  var datastoresLoading = false;
  var DS_READY_EVENT = 'ds_ready';

  function getDatastore(owner) {
    if (datastores[owner]) {
      return Promise.resolve(datastores[owner]);
    }

    return new Promise(function(resolve, reject) {
      if (datastoresLoading === true) {
        document.addEventListener(DS_READY_EVENT, function handler() {
          document.removeEventListener(DS_READY_EVENT, handler);
          resolve(datastores[owner]);
        });
      }
      else {
        datastoresLoading = true;

        navigator.getDataStores('contacts').then(function success(dsList) {
          dsList.forEach(function(aDs) {
            datastores[aDs.owner] = aDs;
          });
          datastores['app://communications.gaiamobile.org'] =
                    new MozContactsDatastore();
          resolve(datastores[owner]);
          datastoresLoading = false;
          document.dispatchEvent(new CustomEvent(DS_READY_EVENT));
        }, function err(error) {
            console.error('Error while obtaining datastores: ', error.name);
        });
      }
    });
  }

  // Adapter object to obtain data from the mozContacts as if it were a DS
  function MozContactsDatastore() {

  }

  MozContactsDatastore.prototype = {
    get: function(id) {
      return new Promise(function(resolve, reject) {
        console.log('Promise mozContacts datastore');

        var options = {
          filterBy: ['id'],
          filterOp: 'equals',
          filterValue: id
        };

        var req = navigator.mozContacts.find(options);

        console.log('After navigator mozContacts.find');

        req.onsuccess = function() {
          console.log('MozContacts Datastore', JSON.stringify(req.result));
          resolve(JSON.parse(JSON.stringify(req.result[0])));
        }

        req.onerror = function() {
          reject(req.error);
        }
      });
    },
    get name() {
      return 'mozContacts'
    }
  }

  function getData(entry) {
    return new Promise(function(resolve, reject) {
      var operations = [];
      var data = {
        id: entry.id
      };

      var entryData = entry.entryData;

      entryData.forEach(function(aEntry) {
        var owner = aEntry.origin;
        console.log('owner: ', owner);

        getDatastore(owner).then(function success(datastore) {
          console.log(datastore.name, aEntry.uid);

          operations.push(datastore.get(aEntry.uid));
          Promise.all(operations).then(function success(results) {
            results.forEach(function(aResult) {
              Object.keys(aResult).forEach(function(aKey) {
                data[aKey] = aResult[aKey];
              });
            });

            console.log('Before resolving ....', JSON.stringify(data));

            resolve(data);
          }, function error(err) {
              console.log('Error while getting data: ', err.name);
          });
        }, function err(error) {
              console.log('Error while obtaining datastore: ', error.name);
        });
      });
    });
  }

  return {
    'getData': getData
  }
})();
