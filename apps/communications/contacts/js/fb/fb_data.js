'use strict';

var fb = window.fb || {};

if (!window.fb.contacts) {
  (function() {
    var contacts = fb.contacts = {};

    var datastore;
    var DATASTORE_NAME = 'Gaia_Facebook_Friends';
    // Record Id for the index
    var INDEX_ID = 1;

    // Indicates the initialization
    var readyState = 'notInitialized';
    var INITIALIZE_EVENT = 'fb_ds_init';

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

    // The index we need to keep the correspondance between FB Friends and
    // datastore Ids
    var index;

    function initError(outRequest, error) {
      outRequest.failed(error);
    }

    function doGet(uid, outRequest) {
      var dsId = index.byUid[uid];

      var successCb = successGet.bind(null, outRequest);
      var errorCb = errorGet.bind(null, outRequest, uid);

      if (typeof dsId === 'undefined') {
        // Refreshing the index just in case
        datastore.get(INDEX_ID).then(function success_index(obj) {
          index = obj;
          dsId = index.byUid[uid];
          if (typeof dsId !== 'undefined') {
            return datastore.get(dsId);
          }
          else {
            var errorName = 'No DataStore Id for UID: ' + uid;
            window.console.error(errorName);
            outRequest.failed(errorName);
            // Just to avoid warnings of no return
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
      window.console.log('Error while getting object for UID: ', uid);
      outReq.failed(err.name);
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
          var uid = obj.uid;
          index.byUid[uid] = newId;
          // Update index by tel
          if (Array.isArray(obj.tel)) {
            obj.tel.forEach(function(aTel) {
              index.byTel[aTel.value] = uid;
            });
          }
          if (Array.isArray(obj.shortTelephone)) {
            obj.shortTelephone.forEach(function(aTel) {
              index.byShortTel[aTel] = uid;
            });
          }
          window.console.log('Saved Id: ', newId, JSON.stringify(index));
          return datastore.update(INDEX_ID, index);
        }, function error(err) {
          window.console.error('Error while adding the new entry: ', err);
        }).then(function success() {
            window.console.log('Index updated correctly');
            outRequest.done();
          },
          function error(err) {
            window.console.error('Error while saving the index: ', err);
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

      var successCb = successRemove.bind(null, outRequest, uid);
      var errorCb = errorRemove.bind(null, outRequest);

      if (typeof dsId === 'undefined') {
        // Refreshing the index
        datastore.get(INDEX_ID).then(function success_index(obj) {
          index = obj;
          dsId = index.byUid[uid];

          if (typeof dsId !== 'undefined') {
            return datastore.remove(dsId);
          }
          else {
            errorRemove(outRequest, {
              name: 'No DataStore Id for UID: ' + uid
            });
            // Just to avoid warnings of no return
            return null;
          }
        }, function(err) {
            window.console.error('Error while getting the index data: ',
                                 err.name);
            errorCb(err);
           }).then(successCb, errorCb);
      }
      else {
        datastore.remove(dsId).then(successCb, errorCb);
      }
    }

    function successRemove(outRequest, uid, removed) {
      if (removed) {
         delete index.byUid[uid];
         outRequest.done();
       }
       else {
         outRequest.failed('Not removed');
       }
    }

    function errorRemove(outRequest, uid, error) {
      window.console.error('FB Data: Error while removing ', uid, ': ',
                           error.name);
      outRequest.failed(error);
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
      readyState = 'initialized';
      if (typeof cb === 'function') {
        window.setTimeout(cb, 0);
      }
      var ev = new CustomEvent(INITIALIZE_EVENT);
      document.dispatchEvent(ev);
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

        datastore.update(INDEX_ID, index).then(function success() {
          outRequest.done();
        }, function error(err) {
          outRequest.failed();
        });

      }, 0);

      return outRequest;
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
          if (length === 0) {
            window.console.log('Adding index as length is 0');
            index = createIndex();
            return datastore.add(index);
          }
          else {
            return datastore.get(INDEX_ID);
          }
        }).then(function(v) {
          window.console.log('Second promise resolved', JSON.stringify(v));
          if (typeof v === 'object') {
            window.console.log('Index Content: ', JSON.stringify(v));
            index = v;
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
