'use strict';

var fb = window.fb || {};

if (!fb.sync) {
  (function() {
    var Sync = fb.sync = {};

    var theWorker;
    // Facebook contacts currently under update process
    var fbContactsById;

    var totalToChange = 0,
        changed = 0;

    // Next timestamp to be set
    var nextTimestamp;

    var completionCallback,
        errorCallback;

    // Only makes sense when the data from FB is provided to the sync module
    // i.e. it is not the worker which obtains that data
    var fbFriendsDataByUid;

    var logLevel = fb.logLevel || parent.fb.logLevel || 'DEBUG';
    var isDebug = (logLevel === 'DEBUG');

    function debug() {
      if(isDebug) {
        var theArgs = ['<<FBSync>>'];
        for(var c = 0; c < arguments.length; c++) {
          theArgs.push(arguments[c]);
        }
        window.console.log.apply(this,theArgs);
      }
    }

    // Starts the worker
    function startWorker() {
      theWorker = new Worker('/facebook/js/sync_worker.js');
      theWorker.onmessage = function(e) {
        workerMessage(e.data);
      }
      theWorker.onerror = function(e) {
        window.console.error('Worker Error', e.message, e.lineno, e.column);
      }
    }

    function workerMessage(m) {
      if (m.type === 'error') {
        window.console.error('FB: Error reported by the worker', m.data);
      }
      else if (m.type === 'trace') {
        debug(m.data);
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
        nextTimestamp = m.data.queryTimestamp;

        debug('Total to be changed: ', totalToChange);

        // If totals === 0 then the completion callback will be invoked
        checkTotals();
      }
      else if (m.type === 'friendImgReady') {
        debug('Friend Img Data ready: ', m.data.contactId);
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
        debug('Friend updated correctly', cfdata.uid);
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

    function removeFbFriend(contactId) {
      debug('Removing Friend: ', contactId);

      var removedFriend = fbContactsById[contactId];

      var fbContact = new fb.Contact(removedFriend);

      if (fb.isFbLinked(removedFriend)) {
        debug('Friend is linked: ', contactId);
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
        debug('Friend is not linked: ', contactId);
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
        debug('Sync process finished!');

        fb.utils.setLastUpdate(nextTimestamp);

        if (window.contacts.List) {
          window.setTimeout(window.contacts.List.load, 0);
        }

        if (typeof completionCallback === 'function') {
          window.setTimeout(completionCallback, 0);
        }

        if(theWorker) {
          theWorker.terminate();
          theWorker = null;
        }
      }
    }


    // Starts a synchronization
    Sync.start = function(callbacks) {
      if(callbacks) {
        completionCallback = callbacks.success;
        errorCallback = callbacks.error;
      }

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
        // Contacts for which an update will be forced
        var forceUpdate = {};

        fbContacts.forEach(function(contact) {
          fbContactsById[contact.id] = contact;
          var pictureUrl = fb.getFriendPictureUrl(contact);
          var uid = fb.getFriendUid(contact);

          uids[uid] = {
            contactId: contact.id,
            photoUrl: pictureUrl
          };

          if(!pictureUrl) {
            forceUpdate[uid] = {
              contactId: contact.id
              // photoUrl is left undefined as it is not known
            };
          }
        });

        fb.utils.getLastUpdate(function run_worker(ts) {
          fb.utils.getCachedAccessToken(function(access_token) {
            // The worker must start
            theWorker.postMessage({
              type: 'start',
              data: {
                uids: uids,
                imgNeedsUpdate: forceUpdate,
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
      nextTimestamp = Date.now();

      changed = 0;
      // As it is not a priori known how many are going to needed a change
      totalToChange = Number.MAX_VALUE;

      debug('Starting Synchronization with data');

      fbFriendsDataByUid = myFriendsByUid;
      // Friends to be updated by the worker (those which profile img changed)
      var toBeUpdated = {};

      fb.utils.getLastUpdate(function import_updates(lastUpdate) {
        var lastUpdateTime = Math.round(lastUpdate / 1000);

        debug('Last update time: ', lastUpdateTime);
        fbContactsById = {};

        contactList.forEach(function(aContact) {
          fbContactsById[aContact.id] = aContact;

          var uid = fb.getFriendUid(aContact);

          var friendData = fbFriendsDataByUid[uid];
          if (friendData) {
            var friendUpdate = friendData.profile_update_time;
            debug('Friend update Time ', friendUpdate, 'for UID: ', uid);

            var profileImgUrl = fb.getFriendPictureUrl(aContact);

            if (friendUpdate > lastUpdateTime ||
                            profileImgUrl !== friendData.pic_big) {
              debug('Friend changed!! : ', uid);

              if (profileImgUrl !== friendData.pic_big) {
                debug('Profile img changed: ', profileImgUrl);

                toBeUpdated[uid] = {
                  contactId: aContact.id
                };
              }
              else {
                debug('Updating friend: ', friendData.uid);
                updateFbFriend(aContact.id, friendData);
              }
            }
            else {
              debug('Friend has not changed', uid);
            }
          }
          else {
            debug('Removing friend: ', aContact.id);
            removeFbFriend(aContact.id);
          }
        });

        debug('First pass of Updates and removed finished');

        // Those friends which image has changed will require help from the
        // worker
        var toBeUpdatedList = Object.keys(toBeUpdated);
        if (toBeUpdatedList.length > 0) {
          totalToChange = changed + toBeUpdatedList.length;

          debug('Starting worker for updating img data');
          startWorker();

          fb.utils.getCachedAccessToken(function(access_token) {

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



  })();
}
