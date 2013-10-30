'use strict';

var fb = window.fb || {};

  (function() {
    var contacts = {};
    fb.contacts = fb.contacts || {};

    var reader;
    var datastore, index;

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

    function doSave(obj, outRequest) {
      var globalId;

      datastore.add(obj).then(function success(newId) {
        var uid = obj.uid;
        index.byUid[uid] = newId;
        // Update index by tel
        // As this is populated by FB importer we don't need to have
        // extra checks
        if (Array.isArray(obj.tel)) {
          obj.tel.forEach(function(aTel) {
            index.byTel[aTel.value] = newId;
          });
        }
        if (Array.isArray(obj.shortTelephone)) {
          obj.shortTelephone.forEach(function(aTel) {
            index.byShortTel[aTel] = newId;
          });
        }
        globalId = newId;

        return datastore.update(INDEX_ID, index);
      }, defaultError(outRequest)).then(function success() {
          defaultSuccessCb(outRequest, globalId);
        }, defaultError(outRequest));
    }

    /**
     *  Allows to save FB Friend Information
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
      }, 0);

      return retRequest;
    };

    /**
     *  Allows to update FB Friend Information
     *
     *
     */
    contacts.update = function(obj) {
      var retRequest = new fb.utils.Request();

      window.setTimeout(function save() {
        contacts.init(function() {
          doUpdate(obj, retRequest);
        },
        function() {
          initError(retRequest);
        });
      }, 0);

      return retRequest;
    };

    function doUpdate(obj, outRequest) {
      var dsId = index.byUid[obj.uid];

      var successCb = successUpdate.bind(null, outRequest);
      var errorCb = errorUpdate.bind(null, outRequest, obj.uid);

      if (typeof dsId !== 'undefined') {
        datastore.update(dsId, obj).then(successCb, errorCb);
      }
      else {
        // Let's try to refresh the index
        datastore.get(INDEX_ID).then(function success_index(data) {
          setIndex(data);
          dsId = index.byUid[obj.uid];
          if (typeof dsId !== 'undefined') {
            return datastore.update(dsId, obj);
          }
          else {
            errorCb({
              name: 'Datastore Id cannot be found'
            });
            // Just to avoid warnings in strict mode
            return null;
          }
        }, errorCb).then(successCb, errorCb);
      }
    }

    function successUpdate(outRequest) {
      outRequest.done();
    }

    function errorUpdate(outRequest, uid, error) {
      window.console.error('Error while updating datastore for: ', uid);
      outRequest.failed(error);
    }

    function doRemove(uid, outRequest, forceFlush) {
      var dsId = index.byUid[uid];

      var errorCb = errorRemove.bind(null, outRequest, uid);
      var objToDelete;

      if (typeof dsId === 'undefined') {
        // Refreshing the index
        datastore.get(INDEX_ID).then(function success_index(obj) {
          setIndex(obj);
          dsId = index.byUid[uid];

          if (typeof dsId !== 'undefined') {
            return datastore.get(dsId);
          }
          else {
            errorRemove(outRequest, {
              name: 'No DataStore Id for UID: ' + uid
            });
            // Just to avoid warnings of no return
            return null;
          }
        }, function(err) {
            errorRemove(outRequest, uid, {
              name: 'Could not get the index data: ' + err.name
            });
          }).then(function success_get_remove(obj) {
            objToDelete = obj;
            return datastore.remove(dsId);
        },errorCb).then(function sucess_rm(removed) {
          successRemove(outRequest, objToDelete, forceFlush, removed);
        }, errorCb);
      }
      else {
        datastore.get(dsId).then(function success_get_remove(obj) {
          objToDelete = obj;
          return datastore.remove(dsId);
        }, errorCb).then(function success_rm(removed) {
          successRemove(outRequest, objToDelete, forceFlush, removed);
        }, errorCb);
      }
    }

    // Needs to update the index data conveniently
    function successRemove(outRequest, deletedFriend, forceFlush, removed) {
      if (removed === true) {
        delete index.byUid[deletedFriend.uid];

        // Need to update the tel indexes
        if (Array.isArray(deletedFriend.tel)) {
          deletedFriend.tel.forEach(function(aTel) {
            delete index.byTel[aTel.value];
          });
        }

        if (Array.isArray(deletedFriend.shortTelephone)) {
          deletedFriend.shortTelephone.forEach(function(aTel) {
            delete index.byShortTel[aTel];
          });
        }

        if (forceFlush) {
          var flushReq = fb.contacts.flush();

          flushReq.onsuccess = function() {
            outRequest.done(true);
          };
          flushReq.onerror = function() {
            outRequest.failed(flushReq.error);
          };
        }
        else {
          isIndexDirty = true;
          outRequest.done(true);
        }
      }
      else {
        outRequest.done(false);
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
     */
    contacts.remove = function(uid, flush) {
      var hasToFlush = (flush === true ? flush : false);
      var retRequest = new fb.utils.Request();

      window.setTimeout(function remove() {
        contacts.init(function() {
          doRemove(uid, retRequest, hasToFlush);
        },
        function() {
           initError(retRequest);
        });
      }, 0);

      return retRequest;
    };

    /**
     *  Removes all the FB Friends and the index
     *
     *  The index is restored as empty
     *
     */
    contacts.clear = function() {
      var outRequest = new fb.utils.Request();

       window.setTimeout(function clear() {
        contacts.init(function() {
          doClear(outRequest);
        },
        function() {
           initError(outRequest);
        });
      }, 0);

      return outRequest;
    };

    function doClear(outRequest) {
      datastore.clear().then(function success() {
        index = createIndex();
        // TODO:
        // This is working but there are open questions on the mailing list
        datastore.update(INDEX_ID, index).then(defaultSuccess(outRequest),
          function error(err) {
            window.console.error('Error while re-creating the index: ', err);
            outRequest.failed(err);
          }
        );
      }, defaultError(outRequest));
    }

    /**
     *  Persists the index on the datastore
     *
     */
    contacts.flush = function() {
      var outRequest = new fb.utils.Request();

      window.setTimeout(function do_Flush() {
        if (readyState !== 'initialized' || !isIndexDirty) {
          window.console.warn(
                      'The datastore has not been initialized or is not dirty');
          outRequest.done();
          return;
        }

        datastore.update(INDEX_ID, index).then(defaultSuccess(outRequest),
                                               defaultError(outRequest));
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

    var methods = {
      init: contacts.init,
      refresh: contacts.refresh,
      save: contacts.save,
      update: contacts.update,
      remove: contacts.remove,
      clear: contacts.clear
    };

    alert('here!!!');

    contacts.init = fb.contacts.init = function(cb, errorCb) {
      alert('here');
      LazyLoader.load('/shared/js/fb/fb_data_reader', function() {
        reader = fb.contacts;
        var readerInit = reader.init;
        Object.keys(methods).forEach(function(method) {
          fb.contacts[method] = methods[method];
        });
        readerInit(function initialized() {
          datastore = reader.datastore;
          index = reader.index;
        }, errorCb);
      });
    };
  })();
