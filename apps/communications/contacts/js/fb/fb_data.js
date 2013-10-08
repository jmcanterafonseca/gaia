'use strict';

var fb = window.fb || {};

if (!window.fb.contacts) {
  (function() {
    var contacts = fb.contacts = {};

    var datastore;
    var DATASTORE_NAME = 'Gaia_Facebook_Friends';
    // Record Id for the index
    var indexId;

    // Indicates whether the component (internal DS) was initialized or not
    var isInitialized = false;
    // Indicates whether the component is in watching mode
    var watchingForChanges = false;

    // The index we need to keep the correspondance between FB Friends and
    // datastore Ids
    var index;

    // Creates the internal Object in the datastore that will act as an index
    function createIndex() {
      return {
        // By Facebook UID
        byUid: Object.create({}),
        // By internationalized tel number
        byTel: Object.create({}),
        // By short tel number
        byShortTel: Object.create({})
      };
    }

    function initError(outRequest, error) {
      outRequest.failed(error);
    }

    function doGet(uid, outRequest) {
      window.console.log('Index content', JSON.stringify(index));

      var dsId = index.byUid[uid];

      if (!dsId) {
        var errorName = 'No DataStore Id for UID: ' + dsId;
        window.console.error(errorName);
        outRequest.failed(errorName);
        return;
      }

      window.console.log('DS Id: ', dsId);

      datastore.get(dsId).then(function success(obj) {
        window.console.log('Do Get: ', JSON.stringify(obj));
        window.console.log(JSON.stringify(obj));
        outRequest.done(obj);
      },
      function error(err) {
        window.console.log('Error get: ', err);
        outRequest.failed(err);
      });
    }

    /**
     *  Allows to obtain the FB contact information by UID
     *
     *
     */
    contacts.get = function(uid) {
      var outRequest = new fb.utils.Request();

      window.setTimeout(function get() {
        contacts.init(function() {
          doGet(uid, outRequest);
        }, function() {
          initError(outRequest);
        });
      },0);

      return outRequest;
    };

    function doGetByPhone(tel, outRequest) {
      var dsId = index.byTel[tel] || index.byShortTel[tel];

      if (typeof dsId === 'number') {
        datastore.get(dsId).then(function success(obj) {
          outRequest.done(obj);
        },
        function error(err) {
          outRequest.failed(err);
        });
      }
      else {
        outRequest.done(null);
      }
    }

    contacts.getByPhone = function(tel) {
      var outRequest = new fb.utils.Request();

      window.setTimeout(function get_by_phone() {
        contacts.init(function get_by_phone() {
          doGetByPhone(tel, outRequest);
        },
        function() {
          initError(outRequest);
        });
      }, 0);

      return outRequest;
    };

    function doSave(obj, outRequest) {
      var dsId = index.byUid[obj.uid];
      if (typeof dsId === 'undefined') {
        datastore.add(obj).then(function success(newId) {
          window.console.log('Saved Id: ', newId, JSON.stringify(index));
          try {
             index.byUid[obj.uid] = newId;
             index.byTel[''] = newId;
             index.byShortTel[''] = newId;
          }
          catch (e) {
            window.console.error(e);
          }
          outRequest.done(newId);
        },
        function error(err) {
          outRequest.failed(err);
        });
      }
      else {
        datastore.update(dsId, obj).then(function success() {
          outRequest.done();
        },
        function error(err) {
          outRequest.failed(err);
        });
      }
    }

    /**
     *  Allows to save FB Contact Information
     *
     *
     */
    contacts.save = function(obj) {
      var retRequest = new fb.utils.Request();

      window.setTimeout(function save() {
        contacts.init(function() {
          doSave(obj, retRequest);
        },
        function() {
          initError(retRequest);
        });
      },0);

      return retRequest;
    };

    // Returns the total number of records in the DataStore (minus 1)
    // That's because the index object also counts
    function doGetLength(outRequest) {
      datastore.getLength().then(function success(length) {
        outRequest.done(length - 1);
      },
      function error(err) {
        outRequest.failed(err);
      });
    }

    contacts.getLength = function() {
      var retRequest = new fb.utils.Request();

      window.setTimeout(function() {
        contacts.init(function get_all() {
          doGetLength(retRequest);
        },
        function() {
          initError(retRequest);
        });
      },0);

      return retRequest;
    };

    function doRemove(uid, outRequest) {
      var dsId = index.byUid[uid];

      datastore.remove(dsId).then(function success(removed) {
        if (removed) {
          delete index.byUid[uid];
          outRequest.done();
        }
        else {
          outRequest.failed('Not removed');
        }

      },
      function error(err) {
        outRequest.failed(err);
      });
    }

    /**
     *  Allows to remove FB contact from the DB
     *
     *
     */
    contacts.remove = function(uid) {
      var retRequest = new fb.utils.Request();

      window.setTimeout(function remove() {
        contacts.init(function() {
          doRemove(uid, retRequest);
        },
        function() {
           initError(retRequest);
        });
      },0);

      return retRequest;
    };

    contacts.clear = function() {
      var outRequest = new fb.utils.Request();

       window.setTimeout(function clear() {
        contacts.init(function() {
          doClear(outRequest);
        },
        function() {
           initError(outRequest);
        });
      },0);

      return outRequest;
    };

    function doClear(outRequest) {
      datastore.clear().then(function success(cleared) {
        if (cleared) {
          index = createIndex();
          datastore.add(index).then(function success(id) {
            indexId = id;
            outRequest.done();
          });
        }
        else {
          outRequest.failed('Not cleared');
        }
      },
      function error(err) {
        outRequest.failed(err);
      });
    }

    function notifyOpenSuccess(cb) {
      isInitialized = true;
      if (typeof cb === 'function') {
        cb();
      }
    }

    // The index is persisted
    contacts.flush = function() {
      var outRequest = new fb.utils.Request();

      window.setTimeout(function do_Flush() {
        if (!isInitialized) {
          window.console.warn('The datastore has not been initialized');
          outRequest.done();
          return;
        }

        datastore.update(indexId, index).then(function success() {
          outRequest.done();
        }, function error(err) {
          outRequest.failed();
        });

      }, 0);

      return outRequest;
    };

    // Listen to changes on the datasource
    contacts.watchChanges = function() {
      var outRequest = new fb.utils.Request();

      window.setTimeout(function do_watchChanges() {
        if (watchingChanges === true) {
          window.console.warn('FB DataStore. Already watching for changes');
          outRequest.done();
          return;
        }

        contacts.init(function() {
          datastore.addEventListener('change', changesListener);
          watchingChanges = true;
          outRequest.done();
        }, function() {
          initError(outRequest);
        });

      }, 0);

      return outRequest;
    };

    contacts.clearWatch = function() {
      if (!watchingChanges) {
        window.console.warn(
                      'FB DataStore. Not previous watching set. Nothing Done');
        return;
      }
      datastore.removeEventListener('change', changesListener);
      watchingChanges = false;
    };

    contacts.init = function(cb, errorCb) {
      if (isInitialized === true) {
        cb();
        return;
      }

      navigator.getDataStores(DATASTORE_NAME).then(function success(ds) {
        if (ds.length < 1) {
          window.console.error('FB: Cannot get access to the DataStore');
           if (typeof errorCb === 'function') {
            errorCb();
          }
          return;
        }

        datastore = ds[0];
        // Checking the length as the index should be there
        datastore.getLength().then(function(length) {
          if (length === 0) {
            window.console.log('Adding index as length is 0');
            index = createIndex();
            return datastore.add(index);
          }
          else {
            return datastore.get(indexId);
          }
        }).then(function(v) {
          window.console.log('Second promise resolved', JSON.stringify(v));
          if (typeof v === 'object') {
            index = Object.create(v);
          }
          else {
            indexId = v;
          }
          notifyOpenSuccess(cb);
        });
      }, function error() {
        window.console.error('FB: Error while opening the DataStore: ',
                                                        e.target.error.name);
        if (typeof errorCb === 'function') {
          errorCb();
        }
     });
    };
  })();
}
