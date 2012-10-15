'use strict';

var fb = window.fb || {};

if (!fb.sync) {
  (function() {
    var Sync = fb.sync = {};

    var theWorker;
    // Facebook contacts currently under update process
    var fbContactsById;

    var totalToChange = 0;

    var changed = 0;

    var completionCallback,
        errorCallback;

    // Only makes sense when the data from FB is provided to the sync module
    // i.e. it is not the worker who obtains that data
    var fbFriendsDataByUid;

    function workerMessage(m) {
      if (m.type === 'friendUpdates') {
        window.console.log('Friend updates arrived!!!',
                           m.data[0].fql_result_set.length);

        window.console.log('Friend deletes arrived!!!',
                           m.data[1].fql_result_set.length);
      }
      else if (m.type === 'error') {
        window.console.error('FB: Error reported by the worker', m.data);
      }
      else if (m.type === 'trace') {
        window.console.log(m.data);
      }
      else if (m.type === 'friendRemoved') {
        removeFbFriend(m.data.contactId);
      }
      else if (m.type === 'friendUpdated') {
        updateFbFriend(m.data.contactId,
                       fb.friend2mozContact(m.data.updatedFbData));
      }
      // Message with the totals
      else if (m.type === 'totals') {
        changed = 0;
        totalToChange = m.data.totalToChange;
        window.console.log('Total to be changed: ', totalToChange);
      }
      else if (m.type === 'friendImgReady') {
        window.console.log('Friend Img Data ready');
        updateFbFriendWhenImageReady(m.data);
      }
    }

    function updateFbFriendWhenImageReady(data) {
      var contact = fbContactsById[data.contactId];
      var uid = fb.getFriendUid(contact);
      var updatedFbData = fbFriendsDataByUid[uid];

      if (data.photo) {
        var fbInfo = {};
        fbInfo.photo = [data.photo];
        fb.setFriendPictureUrl(fbInfo, updatedFbData.pic_big);
        updatedFbData.fbInfo = fbInfo;
      }

      updateFbFriend(data.contactId, updatedFbData);
    }

    function onsuccessCb() {
      changed++;
      checkTotals();
    }

    function removeFbFriend(contactId) {
      window.console.log('Removing Friend: ', contactId);

      var removedFriend = fbContactsById[contactId];

      var fbContact = new fb.Contact(removedFriend);

      if (fb.isFbLinked(removedFriend)) {
        window.console.log('Friend is linked: ', contactId);
        // No care about what happens
        var req = fbContact.unlink('hard');
        req.onsuccess = onsuccessCb;

        req.onerror = function() {
          window.console.error('FB. Error while hard unlinking friend: ',
                               contactId);
          // The counter has to be increased anyway
          changed++;
          checkTotals();
        }
      }
      else {
        window.console.log('Friend is not linked: ', contactId);
        var req = fbContact.remove();
        req.onsuccess = onsuccessCb;
        req.onerror = function() {
          window.console.error('FB. Error while removing contact: ',
                               contactId);
          // The counter has to be increased anyway
          changed++;
          checkTotals();
        }
      }
    }

    function checkTotals() {
      if (changed === totalToChange) {
        window.console.log('Sync process finished!');

        fb.utils.setLastUpdate(Date.now());

        if (window.contacts.List) {
          window.setTimeout(window.contacts.List.load, 0);
        }

        if (typeof completionCallback === 'function') {
          window.setTimeout(completionCallback, 0);
        }
      }
    }

    // Starts the worker
    function startWorker() {
      if (!theWorker) {
        theWorker = new Worker('/contacts/js/fb/sync_worker.js');
        theWorker.onmessage = function(e) {
          workerMessage(e.data);
        }
      }
    }

    // Starts a synchronization
    Sync.start = function(callbacks) {
      completionCallback = callback.success;
      errorCallback = callback.error;

      totalToChange = 0;
      changed = 0;

      startWorker();

      // First only take into account those Friends already on the device
      // This work has to be done here and not by the worker as it has no
      // access to the Web APIs
      var req = fb.utils.getAllFbContacts();

      req.onsuccess = function() {
        var uids = {};
        var fbContacts = req.result;

        if (fbContacts.length === 0) {
          return;
        }

        // Contacts by id are cached for later update
        fbContactsById = {};
        fbContacts.forEach(function(contact) {
          fbContactsById[contact.id] = contact;

          uids[fb.getFriendUid(contact)] = {
            contactId: contact.id,
            photoUrl: fb.getFriendPictureUrl(contact)
          };

          window.alert(uids[fb.getFriendUid(contact)].photoUrl);
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
        if(typeof errorCallback === 'function') {
          errorCallback(req.error);
        }
      }
    }

    // Starts a synchronization with data coming from import / link
    Sync.startWithData = function(contactList, myFriendsByUid, callbacks) {
      completionCallback = callbacks.success;
      errorCallback = callbacks.error;

      changed = 0;
      // As it is not a priori known how many are going to needed a change
      totalToChange = Number.MAX_VALUE;

      window.console.log('Starting Synchronization with data');

      fbFriendsDataByUid = myFriendsByUid;
      // Friends to be updated by the worker (those which profile img changed)
      var toBeUpdated = {};

      fb.utils.getLastUpdate(function import_updates(lastUpdate) {
        window.console.log('Last update time: ', lastUpdate);
        fbContactsById = {};

        contactList.forEach(function(aContact) {
          fbContactsById[aContact.id] = aContact;

          var uid = fb.getFriendUid(aContact);

          var friendData = fbFriendsDataByUid[uid];
          if (friendData) {
            var friendUpdate = friendData.profile_update_time;
            window.console.log('Friend update', friendUpdate);

            if (friendUpdate > Math.round(lastUpdate / 1000)) {
              window.console.log('Friend changed!!');

              var profileImgUrl = fb.getFriendPictureUrl(aContact);

              window.console.log('Profile Img Url:', profileImgUrl);

              if (profileImgUrl !== friendData.pic_big) {
                toBeUpdated[uid] = {
                  contactId: aContact.id
                };
              }
              else {
                window.console.log('Updating friend: ', friendData.uid);
                updateFbFriend(aContact.id, friendData);
              }
            }
          }
          else {
            window.console.log('Removing friend: ', aContact.id);
            removeFbFriend(aContact.id);
          }
        });

        window.console.log('Simple Updates and removed finished');

        // Those friends which image has changed will require help from the
        // worker
        var toBeUpdatedList = Object.keys(toBeUpdated);
        if (toBeUpdatedList.length > 0) {
          window.console.log('Starting worker for updating img data');
          totalToChange = changed + toBeUpdatedList.length;

          startWorker();
          fb.utils.getCachedAccessToken(function(access_token) {
            window.console.log('going to send message to the worker ', theWorker, access_token);
            theWorker.postMessage({
              type: 'startWithData',
              data: {
                access_token: access_token,
                uids: toBeUpdated
              }
            });
          });
        }
        else {
          totalToChange = changed;
          checkTotals();
        }
      });
    }

    // Updates the FB data from a friend
    function updateFbFriend(contactId, cfdata) {
      cfdata.fbInfo = cfdata.fbInfo || {};

      cfdata.fbInfo.org = [fb.getWorksAt(cfdata)];
      var birthDate = null;
      if (cfdata.birthday_date && cfdata.birthday_date.length > 0) {
        birthDate = fb.getBirthDate(cfdata.birthday_date);
      }
      cfdata.fbInfo.bday = birthDate;

      var address = fb.getAddress(cfdata);
      if(address) {
        cfdata.fbInfo.adr = [address];
      }

       // Then the new data saved to the cache
      var fbContact = new fb.Contact(fbContactsById[contactId]);
      var fbReq = fbContact.update(cfdata);

      // Nothing special
      fbReq.onsuccess = function() {
        window.console.log('Friend updated correctly', cfdata.uid);
        onsuccessCb();
      }

      // Error. mark the contact as pending to be synchronized
      fbReq.onerror = function() {
        window.console.error('FB: Error while saving contact data: ',
                             cfdata.uid);
        changed++;
        checkTotals();
      }
    }

  })();
}
