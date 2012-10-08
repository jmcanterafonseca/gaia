'use strict';

var fb = window.fb || {};

if(!fb.sync) {
  (function() {
    var Sync = fb.sync = {};

    var theWorker;

    function workerMessage(m) {
      if(m.type === 'friendUpdates') {
        window.console.log('Friend updates arrived!!!',
                           m.data[0].fql_result_set.length);
        
        window.console.log('Friend deletes arrived!!!',
                           m.data[1].fql_result_set.length);
      }
      else if(m.type === 'error') {
        window.console.error('FB: Error reported by the worker', m.data);
      }
      else if(m.type === 'trace') {
        window.console.log(m.data);
      }
    }

    Sync.start = function() {
      alert('starting');

      if(!theWorker) {
        theWorker = new Worker('/contacts/js/fb/sync_worker.js');
        theWorker.onmessage = function(e) {
          window.console.log('Message from the worker',e.data);
          workerMessage(e.data);
        }
      }

      // First only take into account those Friends already on the device
      // This work has to be done here and not by the worker
      var req = fb.utils.getAllFbContacts();

      req.onsuccess = function() {
        var uids = [];
        if(!req.result.length > 0) {
          return;
        }

        req.result.forEach(function(contact) {
          var fbContact = new fb.Contact(contact);
          uids.push(fbContact.uid);
        });

        fb.utils.getLastUpdate(function run_worker(ts) {
          fb.utils.getCachedAccessToken(function(access_token) {
            // The worker must start
            theWorker.postMessage({
              type: 'start',
              data: {
                uids: uids,
                timestamp: ts,
                access_token: access_token
              }
            });
          });
        });
      }

      req.onerror = function() {
        window.console.error('FB: Error while getting friends on the device');
      }
    }

  })();
}
