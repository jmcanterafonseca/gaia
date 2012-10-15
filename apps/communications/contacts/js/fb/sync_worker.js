'use strict';

importScripts('fb_query.js', 'fb_contact_utils.js', 'console.js');

(function(wutils) {

  var uids,
      timestamp,
      access_token;

  var retriedTimes = 0;
  var MAX_TIMES_TO_RETRY = 3;

  wutils.addEventListener('message', processMessage);

  self.console.log('Worker up and running');

  // Query to know what friends need to be updated
  var UPDATED_QUERY = [
      'SELECT uid, name, first_name, last_name, ' ,
      'middle_name, birthday_date, email, ' ,
      'work, cell, other_phone, hometown_location, pic_big ' ,
      ' FROM user' ,
      ' WHERE uid ',
      ' IN (SELECT uid1 FROM friend WHERE uid2=me()',
      ' AND uid1 IN (',
      null,
      ') )',
      ' AND profile_update_time > ',
      null
    ];

  // Query to know what friends need to be removed
  var REMOVED_QUERY = [
    'SELECT target_id FROM ',
    'connection where source_id = me() ',
    ' AND target_type = "user" AND is_deleted="true"',
    ' AND target_id IN (',
    null,
    ')'
  ];

  function buildQueries(ts, uids) {
    var uidsFilter = uids.join(',');

    // The index at which the timestamp is set
    var IDX_TS = 10;
    UPDATED_QUERY[IDX_TS] = Math.round(ts / 1000);

    // UPDATED_QUERY[IDX_TS] = 1;

    // The index at which uids filter is set
    var IDX_UIDS = 7;
    UPDATED_QUERY[IDX_UIDS] = uidsFilter;

    var R_IDX_UIDS = 4;
    REMOVED_QUERY[R_IDX_UIDS] = uidsFilter;

    // Two queries launched at the same time
    var outQueries = {
      query1: UPDATED_QUERY.join(''),
      query2: REMOVED_QUERY.join('')
    };

    return JSON.stringify(outQueries);
  }

  // Launch a multiple query to obtain friends to be updated and deleted
  function getFriendsToBeUpdated(ts, uids, access_token) {
    var query = buildQueries(ts, uids);
    var callbacks = {
      success: friendsReady,
      error: errorQueryCb,
      timeout: timeoutQueryCb
    };

    self.console.log(query);

    fb.utils.runQuery(query, callbacks, access_token);
  }

  // Callback executed when data is ready
  function friendsReady(response) {
    var updateList = response.data[0].fql_result_set;
    var removeList = response.data[1].fql_result_set;
    // removeList = [{target_id: '100001127136581'}];

    if (typeof response.error === 'undefined') {
      wutils.postMessage({
        type: 'totals',
        data: {
          totalToChange: updateList.length + removeList.length
        }
      });

      syncUpdatedFriends(updateList);
      syncRemovedFriends(removeList);
    }
    else {
      postError(response.error);
    }
  }

  function errorQueryCb(e) {
    self.console.error('FB Sync: Error while trying to sync');
    // Here it is needed to set a new alarm for the next n hours
  }

  function timeoutQueryCb(e) {
    if (retriedTimes < MAX_TIMES_TO_RETRY) {
      self.console.log('FB Sync. Retrying ... for ',
                         retriedTimes + 1, ' times');
      retriedTimes++;
      getFriendsToBeUpdated(uids, timestamp, access_token);
    }
    else {
      // Now set the alarm to do it in the near future
    }
  }

  function postError(e) {
    wutils.postMessage({
      type: 'error',
      data: e
    });
  }

  function syncRemovedFriends(removedFriends) {
    self.console.log('Friends to be removed: ', removedFriends.length);

    // Simply an iteration over the collection is done and a message passed
    removedFriends.forEach(function(aremoved) {
      var removedRef = uids[aremoved.target_id];

      if (removedRef) {
        wutils.postMessage({
          type: 'friendRemoved',
          data: {
            uid: aremoved.target_id,
            contactId: removedRef.contactId
          }
        });
      }

    }); // forEach
  }


  function syncUpdatedFriends(updatedFriends) {
     self.console.log('Friends to be updated: ', updatedFriends.length);

    // Friends which image has to be updated
    var friendsImgToBeUpdated = {};

    updatedFriends.forEach(function(afriend) {
      var friendInfo = uids[afriend.uid];

      if (!friendInfo) {
        return;
      }

      if (afriend.pic_big !== friendInfo.photoUrl) {
        // Photo changed
        self.console.log('Contact Photo Changed!!! for ', afriend.uid);
        friendsImgToBeUpdated[afriend.uid] = afriend;
      }
      else {
        self.console.log('Contact Photo unchanged for ', afriend.uid);
        wutils.postMessage({
          type: 'friendUpdated',
          data: {
            updatedFbData: afriend,
            contactId: friendInfo.contactId
          }
        });
      }

      // Now it is time to download the images needed
      var imgSync = new ImgSynchronizer(Object.keys(friendsImgToBeUpdated));

      imgSync.start();

      // Once an image is ready friend update is notified
      imgSync.onimageready = function(uid, blob) {
        if (blob) {
          var friendData = friendsImgToBeUpdated[uid];
          friendData.fbInfo = {};
          friendData.fbInfo.photo = [blob];
          fb.setFriendPictureUrl(friendData.fbInfo, friendData.pic_big);
        }
        else {
          self.console.error('Img for UID', uid, ' could not be retrieved ');
          // This friend has to be marked in a special state just to be
          // synced later on
        }

        wutils.postMessage({
          type: 'friendUpdated',
          data: {
            updatedFbData: friendData,
            contactId: uids[uid].contactId
          }
        });
      }

    });
  }

  // For dealing with the case that only new imgs have to be retrieved
  function getNewImgsForFriends(friendList) {
    self.console.log('Getting new imgs for friends', JSON.stringify(friendList));

    var imgSync = new ImgSynchronizer(friendList);

    imgSync.start();

    // Once an image is ready friend update is notified
    imgSync.onimageready = function(uid, blob) {
      self.console.log('Img Ready from worker');

      if (!blob) {
        self.console.error('Img for UID: ', uid, ' could not be retrieved ');
      }

      wutils.postMessage({
        type: 'friendImgReady',
        data: {
          photo: blob,
          contactId: uids[uid].contactId
        }
      });
    }
  }

  function processMessage(e) {
    self.console.log('process message in the worker');

    var message = e.data;

    if (message.type === 'start') {
      uids = message.data.uids;
      access_token = message.data.access_token;
      timestamp = message.data.timestamp;

      wutils.postMessage({
        type: 'trace',
        data: 'Ackx!!! ' + Object.keys(uids).length
      });

      retriedTimes = 0;
      getFriendsToBeUpdated(timestamp, Object.keys(uids), access_token);
    }
    else if (message.type === 'startWithData') {
      self.console.log('start With Data message in the worker');

      uids = message.data.uids;
      access_token = message.data.access_token;
      getNewImgsForFriends(Object.keys(uids), access_token);
    }
  }

  var ImgSynchronizer = function(friends) {
    var next = 0;
    var self = this;

    this.friends = friends;

    this.start = function() {
      retrieveImg(this.friends[next]);
    }

    function imgRetrieved(blob) {
      if (typeof self.onimageready === 'function') {
        var uid = self.friends[next];

        wutils.setTimeout(function() {
          self.onimageready(uid, blob);
        },0);
      }

      // And lets go for the next
      next++;
      if (next < self.friends.length) {
        retrieveImg(self.friends[next]);
      }
    }

    function retrieveImg(uid) {
      fb.utils.getFriendPicture(uid, imgRetrieved, access_token);
    }
  }

})(self);
