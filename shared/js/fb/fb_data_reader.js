'use strict';

var fb = window.fb || {};

  (function() {
    var contacts = fb.contacts = {};

    var datastore;
    // Datastore name declared on the manifest.webapp
    var DATASTORE_NAME = 'Gaia_Facebook_Friends';
    // Record Id for the index
    var INDEX_ID = 1;

    // Indicates the initialization state
    var readyState = 'notInitialized';
    // Custom event for notifying initializations
    var INITIALIZE_EVENT = 'fb_ds_init';

    // Creates the internal Object in the datastore that will act as an index
    function createIndex() {
      return {
        // By Facebook UID
        byUid: Object.create(null),
        // By internationalized tel number
        // (We are not supporting dups right now)
        byTel: Object.create(null),
        // By short tel number
        // (We are not supporting dups right now)
        byShortTel: Object.create(null)
      };
    }

    // The index we need to keep the correspondance between FB Friends and
    // datastore Ids
    var index;

    // Indicates whether the index is dirty
    var isIndexDirty = false;

    function notifyOpenSuccess(cb) {
      readyState = 'initialized';
      if (typeof cb === 'function') {
        window.setTimeout(cb, 0);
      }
      var ev = new CustomEvent(INITIALIZE_EVENT);
      document.dispatchEvent(ev);
    }

    function initError(outRequest, error) {
      outRequest.failed(error);
    }

    // Creates a default handler for errors
    function defaultError(request) {
      return defaultErrorCb.bind(null, request);
    }

    // Creates a default handler for success
    function defaultSuccess(request) {
      return defaultSuccessCb.bind(null, request);
    }

    function defaultErrorCb(request, error) {
      request.failed(error);
    }

    function defaultSuccessCb(request, result) {
      request.done(result);
    }

    function setIndex(obj) {
      index = obj;
      isIndexDirty = false;
    }

    function doGet(uid, outRequest) {
      var dsId = index.byUid[uid];

      var successCb = successGet.bind(null, outRequest);
      var errorCb = errorGet.bind(null, outRequest, uid);

      if (typeof dsId === 'undefined') {
        // Refreshing the index just in case
        datastore.get(INDEX_ID).then(function success_index(obj) {
          setIndex(obj);
          dsId = index.byUid[uid];
          if (typeof dsId !== 'undefined') {
            return datastore.get(dsId);
          }
          else {
            errorGet(outRequest, uid, {
              name: 'No DataStore Id found'
            });
            // Just to avoid warnings of function not always returning
            return null;
          }
        }, errorCb).then(successCb, errorCb);
      }
      else {
        datastore.get(dsId).then(successCb, errorCb);
      }
    }

    function successGet(outReq, data) {
      outReq.done(data);
    }

    function errorGet(outReq, uid, err) {
      window.console.error('Error while getting object for UID: ', uid);
      outReq.failed(err.name);
    }

    Object.defineProperty(contacts, 'datastore', {
      get: function getDataStore() { return datastore },
      enumerable: false,
      configurable: false
    });

    Object.defineProperty(contacts, 'index', {
      get: function getIndex() { return index },
      set: setIndex,
      enumerable: false,
      configurable: false
    });

    /**
     *  Allows to obtain the FB friend information by UID
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
      }, 0);

      return outRequest;
    };

    function doGetByPhone(tel, outRequest) {
      var dsId = index.byTel[tel] || index.byShortTel[tel];

      if (typeof dsId !== 'undefined') {
        datastore.get(dsId).then(function success(friend) {
          outRequest.done(friend);
        }, defaultError(outRequest));
      }
      else {
        // Refreshing the index just in case
        datastore.get(INDEX_ID).then(function success(obj) {
          setIndex(obj);
          dsId = index.byTel[tel] || index.byShortTel[tel];
          if (typeof dsId !== 'undefined') {
            datastore.get(dsId).then(function success(friend) {
              outRequest.done(friend);
            }, defaultError(outRequest));
          }
          else {
            outRequest.done(null);
          }
        }, function(err) {
          window.console.error('The index cannot be refreshed: ', err.name);
          outRequest.failed(err);
        });
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


    /**
     *  Refreshes the index data
     *
     */
    contacts.refresh = function() {
      var outRequest = new fb.utils.Request();

       window.setTimeout(function clear() {
        contacts.init(function() {
          doRefresh(outRequest);
        },
        function() {
           initError(outRequest);
        });
      }, 0);

      return outRequest;
    };

    function doRefresh(outRequest) {
      if (isIndexDirty) {
        datastore.get(INDEX_ID).then(function success(obj) {
          setIndex(obj);
          outRequest.done();
        }, defaultError(outRequest));
      }
      else {
        outRequest.done();
      }
    }

     /**
     *  Allows to return the total number of records in the DataStore (minus 1)
     *  That's because the index object also counts
     *
     */
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
      }, 0);

      return retRequest;
    };

    contacts.init = function(cb, errorCb) {
      if (readyState === 'initialized') {
        cb();
        return;
      }

      if (readyState === 'initializing') {
        document.addEventListener(INITIALIZE_EVENT, function oninitalized() {
          cb();
          document.removeEventListener(INITIALIZE_EVENT, oninitalized);
        });
        return;
      }

      readyState = 'initializing';

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
          if (length === 0 && datastore.readOnly === false) {
            window.console.info('Adding index as length is 0');
            setIndex(createIndex());
            return datastore.add(index);
          }
          else if (datastore.readOnly === false) {
            return datastore.get(INDEX_ID);
          }
          else {
            // Index is created in order not to cause errors
            window.console.warn('The datastore is empty and readonly');
            setIndex(createIndex());
            notifyOpenSuccess(cb);
            return null;
          }
        }).then(function(v) {
          if (typeof v === 'object') {
            setIndex(v);
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

