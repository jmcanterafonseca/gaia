'use strict';


var fb = window.fb || {};
var Sync = fb.sync || {};
fb.sync = Sync;

(function() {
  var Alarm = Sync.alarm = {};

  var ALARM_ID_KEY = fb.utils.ALARM_ID_KEY;
  var isSyncOngoing = false;

  Alarm.init = function() {
    fb.init(function fb_alarm_init() {

      if(navigator.mozHasPendingMessage('alarm')) {
        navigator.mozSetMessageHandler('alarm',handleAlarm);
      }
      else {
        setNextAlarm(true);
      }
    }); // fb.init
  }

  function handleAlarm(message) {
    function syncSuccess() {
      fb.sync.debug('Sync finished ok at ', new Date());
      isSyncOngoing = false;

      doSetNextAlarm(false, function() {
        fb.sync.debug('Closing the app that did the sync');
        window.close();
      });
    }

    function syncError() {
      isSyncOngoing = false;
      window.console.error('Sync error');
    }

    // First is checked if this is a sync alarm
    if(message.data.sync && !isSyncOngoing) {
      isSyncOngoing = true;
      fb.sync.debug('Starting sync at: ', new Date());

      // The next alarmid is removed
      window.asyncStorage.removeItem(ALARM_ID_KEY);

      fb.sync.start({
        success: syncSuccess,
        error: syncError
      });
    }
    else {
      fb.sync.debug('Alarm message recieved but was not a sync message');
    }
  }

  function setNextAlarm(notifyParent) {
    // Let's check whether there was a previous set alarm
    window.asyncStorage.getItem(ALARM_ID_KEY, function(data) {
      if(data && data.value) {
        // If there was a previous alarm it has to be removed
        fb.sync.debug('Removing existing alarm: ', data.value);
        var req = navigator.mozAlarms.remove(data.value);
      }

      doSetNextAlarm(notifyParent);
    });
  }

  function doSetNextAlarm(notifyParent, callback) {
    fb.utils.getLastUpdate(function(timestamp) {
      var nextUpdate = timestamp + fb.syncPeriod * 60 * 60 * 1000;
      // var nextUpdate = timestamp + 60 * 1000;
      var scheduledDate = new Date(nextUpdate);

      fb.sync.debug('Going to set a new alarm at: ', scheduledDate);

      var req = navigator.mozAlarms.add(scheduledDate,
                                        'honorTimezone',{
        sync: true});

      req.onsuccess = function() {
        // Set the last alarm id
         window.asyncStorage.setItem(ALARM_ID_KEY, {
          id: req.result
        });

        if(notifyParent) {
          window.setTimeout(function() {
            parent.fb.sync.onAlarmScheduled(scheduledDate);
          },0);
        }

        fb.sync.debug('Alarm correctly set!!');

        if(typeof callback === 'function') {
          callback();
        }
      }

      req.onerror = function() {
        if(notifyParent) {
          window.setTimeout(function() {
            parent.fb.sync.onAlarmError(req.error);
          },0);
        }
        else {
          window.console.error('<<FBSync>> Error while setting next alarm',
                               req.error);
        }
      }

    }); // Get last update
  }

  // Everything starts
  Alarm.init();

})();



