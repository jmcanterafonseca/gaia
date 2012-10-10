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
        updateFbFriend(m.data.contactId, m.data.updatedFbData);
      }
    }

    function removeFbFriend(contactId) {
      window.console.log('Removing Friend: ', contactId);

      var removedFriend = fbContactsById[contactId];

      window.console.log(JSON.stringify(removedFriend.category));

      var fbContact = new fb.Contact(removedFriend);

      if(fb.isFbLinked(removedFriend)) {
        window.console.log('Friend is linked ', contactId);
        // No care about what happens
        fbContact.unlink('hard');
      }
      else {
        window.console.log('Friend is not linked ', contactId);
        fbContact.remove();
      }
    }

    Sync.start = function() {
      if(!theWorker) {
        theWorker = new Worker('/contacts/js/fb/sync_worker.js');
        theWorker.onmessage = function(e) {
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
    function updateFbFriend(contactId, cfdata) {
      fb.friend2mozContact(cfdata);

      cfdata.fbInfo = cfdata.fbInfo || {};

      cfdata.fbInfo.org = [fb.getWorksAt(cfdata)];
      var birthDate = null;
      if (cfdata.birthday_date && cfdata.birthday_date.length > 0) {
        birthDate = fb.getBirthDate(cfdata.birthday_date);
      }
      cfdata.fbInfo.bday = birthDate;

       // Then the new data saved to the cache
      var fbContact = new fb.Contact(fbContactsById[contactId]);
      var fbReq = fbContact.update(cfdata);

      // Nothing special
      fbReq.onsuccess = function() {
        window.console.log('Friend updated correctly', cfdata.uid);
      }

      // Error. mark the contact as pending to be synchronized
      fbReq.onerror = function() {
        window.console.error('FB: Error while saving contact data',cfdata.uid);
      }
    }

  })();
}
