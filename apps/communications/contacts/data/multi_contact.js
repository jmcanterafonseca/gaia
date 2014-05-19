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
          resolve(datastores[owner]);
          datastoresLoading = false;
          document.dispatchEvent(new CustomEvent(DS_READY_EVENT));
        }, function err(error) {
            console.error('Error while obtaining datastores: ', error.name);
        });
      }
    });
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
