'use strict';

var fb = window.fb || {};

if(!fb.sync) {
  (function() {
    var Sync = fb.sync = {};

    var theWorker;
    // Facebook contacts currently under update process
    var fbContactsById;

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
      else if(m.type === 'friendRemoved') {
        removeFbFriend(m.data.contactId);
      }
      else if(m.type === 'friendUpdated') {
        updateFbFriend(m.data);
      }
    }

    function removeFbFriend(contactId) {
      var removedFriend = fbContactsById[contactId];
      var fbContact = new fb.Contact(removedFriend);

      if(fb.isFbLinked(fbContact)) {
        // No care about what happens
        fbContact.unlink('hard');
      }
      else {
        fbContact.remove();
      }
    }

    Sync.start = function() {
      if(!theWorker) {
        theWorker = new Worker('/contacts/js/fb/sync_worker.js');
        theWorker.onmessage = function(e) {
          window.console.log('Message from the worker',e.data);
          workerMessage(e.data);
        }
      }

      // First only take into account those Friends already on the device
      // This work has to be done here and not by the worker as it has no
      // access to the Web APIs
      var req = fb.utils.getAllFbContacts();

      req.onsuccess = function() {
        var uids = {};
        var fbContacts = req.result;

        if(fbContacts.length === 0) {
          return;
        }

        // Contacts by id are cached for later update
        fbContactsById = {};
        fbContacts.forEach(function(contact) {
          fbContactsById[contact.id] = contact;

          uids[fb.getFriendUid(contact)] = {
            contactId: contact.id,
            photoUri: fb.getFriendPictureUrl(contact)
          }
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

    // Updates the FB data from a friend
    function updateFbFriend(data) {
      // Photo URL has to be updated
      // Then the new data saved to the cache
    }

  })();
}
