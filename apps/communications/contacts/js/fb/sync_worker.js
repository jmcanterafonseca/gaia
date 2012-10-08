'use strict';

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

  function runQuery(query,callback,access_token) {
    wutils.postMessage({
      type: 'trace',
      data: query
    });

    var queryService = 'https://graph.facebook.com/fql?q=';
    queryService += encodeURIComponent(query);

    var params = ['access_token' + '=' + access_token,
                    'format=json'];

    var queryParams = params.join('&');

    var remote = queryService + '&' + queryParams;

    var xhr = new XMLHttpRequest({
      mozSystem: true
    });

    xhr.open('GET', remote, true);
    xhr.responseType = 'json';

    xhr.timeout = 30000;

    xhr.onload = function(e) {
      if (xhr.status === 200 || xhr.status === 0) {
        if (callback && typeof callback.success === 'function')
          callback.success(xhr.response);
      }
      else {
        postError('FB: Error executing query. Status: ' + xhr.status);
        if (callback && typeof callback.error === 'function')
          callback.error();
      }
    }

    xhr.ontimeout = function(e) {
      window.console.error('FB: Timeout!!! while executing query', query);
      if (callback && typeof callback.timeout === 'function')
        callback.timeout();
    }

    xhr.onerror = function(e) {
      window.console.error('FB: Error while executing query', e);
      if (callback && typeof callback.error === 'function')
        callback.error();
    }

    xhr.send();
  }

  // Launch a multiple query to obtain friends to be updated and deleted
  function getFriendsToBeUpdated(ts, uids, access_token) {
    var query = buildQueries(ts, uids);
    var callbacks = {
      success: friendsReady
    };

    runQuery(query, callbacks, access_token);
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

      getFriendsToBeUpdated(timestamp,uids,access_token);
    }
  }

})(this);
