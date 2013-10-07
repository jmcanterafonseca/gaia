'use strict';

var fb = window.fb || {};

if (!window.fb.contacts) {
  (function() {
    var contacts = fb.contacts = {};

    var datastore;
    var DATASTORE_NAME = 'Gaia_Facebook_Friends';
    // Record Id for the index
    var INDEX_ID = 1;

    var isInitialized = false;

    // The index we need to keep
    var index;

    function initError(outRequest, error) {
      outRequest.failed(error);
    }

    function doGet(uid, outRequest) {
      window.console.log('Index content', JSON.stringify(index));

      var dsId = index[uid];

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
      var retRequest = new fb.utils.Request();

      window.setTimeout(function get() {
        contacts.init(function() {
          doGet(uid, retRequest);
        }, function() {
          initError(retRequest);
        });
      },0);

      return retRequest;
    };

    function doGetByPhone(tel, outRequest) {
      var transaction = database.transaction([STORE_NAME], 'readonly');
      var objectStore = transaction.objectStore(STORE_NAME);

      var index = objectStore.index(INDEX_LONG_PHONE);
      var areq = index.get(tel);
      areq.onsuccess = function(e) {
        if (e.target.result) {
          outRequest.done(e.target.result);
        }
        else {
          var otherIndex = objectStore.index(INDEX_SHORT_PHONE);
          var otherReq = otherIndex.get(tel);
          otherReq.onsuccess = function(e) {
            outRequest.done(e.target.result);
          };
          otherReq.onerror = function(e) {
            outRequest.failed(e.target.error);
          };
        }
      };

      areq.onerror = function(e) {
        outRequest.failed(e.target.error);
      };
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
      var dsId = index[obj.uid];
      if (typeof dsId === 'undefined') {
        datastore.add(obj).then(function success(newId) {
          window.console.log('Saved Id: ', newId, JSON.stringify(index));
          try {
             index[obj.uid] = newId;
          }
          catch(e) {
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

    function doGetLength(outRequest) {
      datastore.getLength().then(function success (length) {
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
      var dsId = index[uid];

      datastore.remove(dsId).then(function success(removed) {
        if (removed) {
          delete index[uid];
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
          index = {};
          outRequest.done(cleared);
          datastore.update(INDEX_ID, index);
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

    contacts.flush = function() {
      var outRequest = new fb.utils.Request();

      window.setTimeout(function do_Flush() {
        if (!isInitialized) {
          window.console.warn('The datastore has not been initialized');
          outRequest.done();
          return;
        }
        datastore.update(INDEX_ID, index).then(function success() {
          outRequest.done();
        }, function error(err) {
          outRequest.failed();
        });

      }, 0);

      return outRequest;
    }

    contacts.init = function(cb, errorCb) {
      if (isInitialized === true) {
        cb();
        return;
      }

      navigator.getDataStores(DATASTORE_NAME).then(function success(ds) {
        if(ds.length < 1) {
          window.console.error('FB: Cannot get access to the DataStore');
           if (typeof errorCb === 'function') {
            errorCb();
          }
          return;
        }

        datastore = ds[0];
        // Checking the length as the index should be there
        datastore.getLength().then(function(length) {
          if(length === 0) {
            window.console.log('Adding index as length is 0');
            index = {};
            return datastore.add(index);
          }
          else {
            return datastore.get(INDEX_ID);
          }
        }).then(function(v) {
          window.console.log('Second promise resolved', JSON.stringify(v));
          if(typeof v === 'object') {
            index = Object.create(v);
          }
          notifyOpenSuccess(cb);
        })
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
