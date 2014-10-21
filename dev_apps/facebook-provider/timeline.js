'use strict';

var Timeline = (function() {
  var ALARM_ID_KEY = '_alarm_scheduled';
  var ACCESS_TOKEN_KEY = '';
  var hardcodedToken = 'CAACEdEose0cBAEIGAtZCVYzRPZC7h9PU9m6Df2oypMpZA7psOyZBZC6j26FqwHF9ymVzdWYhfldf7Tqq56X4EDCZALXEcCRtkHGmH7gZBIhZBip7Vjy8LHDVx6ExBrftaQ9VT5INgFw1LhbKZAwHs4Xca4XQj9lNy6WJrW7uHIyXdzFYR7OphDVOmSMthKDLK4cI7pydQDnuCN4QZBLZAroY7H5PuDrxcsYeMEZD';

  var graphAPI = 'htts://graph.facebook.com/v2.1';
  var endPoint =
          'me/home?fields=id,from,type,picture,message,name,link&limit=2';

  function start() {
    syncTimeline();
  }

  function getFacebookToken() {
    // return ImportStatusData.get('');
    return Promise.resolve(hardcodedToken);
  }

  function init() {
    document.getElementById('start').addEventListener('click', start);
  }

  /**
    {
      "id": "604725959654079_604625632997445",
      "from": {
        "id": "604725959654079",
        "name": "Open Web Device"
      },
      "type": "link",
      "picture": "https://fbexternal-a.akamaihd.net/app_full_proxy.php?",
      "message": "#FirefoxOS spreads its paws",
      "name": "Firefox OS spreads its paws - 12 smartphones now in support",
      "link": "http://t.co/VvcCQ7OTL9",
      "created_time": "2014-10-21T09:45:17+0000"
    }
   */
  function syncTimeline() {

  }

  function scheduleAt(hours, callback) {
    var nextUpdate = Date.now() + hours * 60 * 60 * 1000;
    var scheduledDate = new Date(nextUpdate);

    console.log('Forcing scheduling an alarm at: ', scheduledDate);

    addAlarm(scheduledDate).then(function() {
      console.log('--> Next Sync forced to happen at: ', scheduledDate);

      if (typeof callback === 'function') {
        callback();
      }
    }).catch(function() {
        console.error('Error!');
    });
  }

  function ackAlarm(callback) {
    // The next alarmid is removed
    // Continuation is enabled even if we cannot remove the id
    window.asyncStorage.removeItem(ALARM_ID_KEY, callback, callback);
  }

   // Adds an alarm at the specified datetime ensuring any existing alarm
  // it is removed and ensuring the id is stored on the asyncStorage
  function addAlarm(at) {
    return new Promise(function(resolve, reject) {
      window.asyncStorage.getItem(ALARM_ID_KEY, function set_alarm(id) {
        if (id) {
          navigator.mozAlarms.remove(Number(id));
        }

        var req = navigator.mozAlarms.add(at, 'honorTimezone', {
          sync: true
        });
        // Setting the new alarm
        req.onsuccess = function() {
          window.asyncStorage.setItem(ALARM_ID_KEY, String(req.result),
          function success_store() {
            resolve(req.result);
          },
          function error_store(e) {
            var errorParam = {
              target: {
                error: e || {
                  name: 'AsyncStorageError'
                }
              }
            };
            reject(errorParam);
          });
        };

        req.onerror = function(e) {
          outReq.failed(e);
        };
      });
    });
  }

  return {
  }
}());
