'use strict';

importScripts('fb_query.js');

(function(wutils) {

  var uids,
      timestamp,
      access_token;

  wutils.addEventListener('message', processMessage);

  // Query to know what friends need to be updated
  var UPDATED_QUERY = [
      'SELECT uid, name, first_name, last_name, ' ,
      'middle_name, birthday_date, email, ' ,
      'work, cell, other_phone, pic_big ' ,
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

  function buildQueries(ts,uids) {
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
    }

    return JSON.stringify(outQueries);
  }

  // Launch a multiple query to obtain friends to be updated and deleted
  function getFriendsToBeUpdated(ts, uids, access_token) {
    var query = buildQueries(ts, uids);
    var callbacks = {
      success: friendsReady
    };

    self.console.log(query);

    fb.utils.runQuery(query, callbacks, access_token);
  }

  // Callback executed when data is ready
  function friendsReady(response) {
    if(typeof response.error === 'undefined') {
      syncUpdatedFriends(response.data[0].fql_result_set);

      syncRemovedFriends(response.data[1].fql_result_set);

      // syncRemovedFriends([{target_id: '100001127136581'}]);
    }
    else {
      postError(response.error);
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

      if(removedRef) {
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
      if(afriend.pic_big !== uids[afriend.uid].photoUrl) {
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
            contactId: uids[afriend.uid].contactId
          }
        });
      }

      // Now it is time to download the images needed
      var imgSync = new ImgSynchronizer(Object.keys(friendsImgToBeUpdated));

      imgSync.start();

      // Once an image is ready friend update is notified
      imgSync.onimageready = function(uid,blob) {
        if(blob) {
          var friendData = friendsImgToBeUpdated[uid];
          friendData.fbInfo = {};
          friendData.fbInfo.photo = [blob];
          friendData.fbInfo.url = [];

          friendData.fbInfo.url.push({
            type: [fb.PROFILE_PHOTO_URI],
            value: friendData.pic_big
          });
        }
        else {
          self.console.error('Img for UID', uid ,' could not be retrieved ');
          // This friend has to be marked in a special state just to be
          // synced later on
        }

        wutils.postMessage({
          type: 'friendUpdated',
          data: {
            updatedFbData: friendsImgToBeUpdated[uid],
            contactId: uids[uid].contactId
          }
        });
      }

    });
  }

  function processMessage(e) {
    var message = e.data;

    if(message.type === 'start') {
      uids = message.data.uids;
      access_token = message.data.access_token;
      timestamp = message.data.timestamp;

      wutils.postMessage({
        type: 'trace',
        data: 'Ackx!!! ' + Object.keys(uids).length
      });

      getFriendsToBeUpdated(timestamp,Object.keys(uids),access_token);
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
      if(typeof self.onimageready === 'function') {
        var uid = self.friends[next];

        wutils.setTimeout(function() {
          self.onimageready(uid,blob);
        },0);
      }

      // And lets go for the next
      next++;
      if(next < self.friends.length) {
        retrieveImg(self.friends[next]);
      }
    }

    function retrieveImg(uid) {
      var callbacks = {
        success: imgRetrieved,
        timeout: null,
        error: null
      };

      fb.utils.getFriendPicture(uid,callbacks, access_token);
    }
  }

})(self);
