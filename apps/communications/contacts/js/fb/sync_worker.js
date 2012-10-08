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
      wutils.postMessage({
        type: 'friendUpdates',
        data: response.data
      });
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

  function processMessage(e) {
    var message = e.data;

    if(message.type === 'start') {
      uids = message.data.uids;
      access_token = message.data.access_token;
      timestamp = message.data.timestamp;

      wutils.setTimeout(function() {
        wutils.postMessage('Ack!!!' + uids.length);
      },0);

      getFriendsToBeUpdated(timestamp,Object.keys(uids),access_token);
    }
  }

})(self);
