'use strict';


var fb = window.fb || {};
var Sync = fb.sync || {};
fb.sync = Sync;

(function() {
  var Alarm = Sync.alarm = {};

  var ALARM_ID_KEY = fb.utils.ALARM_ID_KEY;
  var isSyncOngoing = false;
  var _ = navigator.mozL10n.get;

  Alarm.init = function() {
    fb.init(function fb_alarm_init() {
      if (navigator.mozHasPendingMessage('alarm')) {
        fb.sync.debug('Alarm System Message Received!!!!!');
        navigator.mozSetMessageHandler('alarm', handleAlarm);
      }
      // Workaround for Gecko Bug. mozHasPendingMessage does not work
      // https://bugzilla.mozilla.org/show_bug.cgi?id=802876
      else if(parent.location === window.location) {
        fb.sync.debug('Fb Sync woke up. Alarm ok. mozHasPendingMsg failed');
        handleAlarm({
          data: {
            sync: true
          }
        })
      }
      else {
        setNextAlarm(true, fb.syncPeriod);
      }
    }); // fb.init
  }

  function handleAlarm(message) {
    function syncSuccess() {
      fb.sync.debug('Sync finished ok at ', new Date());
      isSyncOngoing = false;

      doSetNextAlarm(false, fb.syncPeriod, function() {
        fb.sync.debug('Closing the app that did the sync');
        window.close();
      });
    }

    function syncError(error) {
      isSyncOngoing = false;
      var theError = error;
      if(!theError) {
        theError = {
          type: 'default'
        }
      }
      switch(theError.type) {
        case 'timeout':
          fb.sync.debug('Timeout error. Setting an alarm for next hour');
          setNextAlarm(false, 1, window.close);
        break;

        case 'invalidToken':
          fb.sync.debug('Invalid token!!!. Notifying the user');
          // A new alarm is not set. It will be set once the user
          // logs in Facebook one more time
          navigator.mozApps.getSelf().onsuccess = function(evt) {
            var app = evt.target.result;
            var iconURL = NotificationHelper.getIconURI(app);
            NotificationHelper.send(_('facebook'), _('notificationLogin'),
                                   iconURL);
          }
          window.close();
        break;

        default:
          window.console.error('Error reported in synchronization: ',
                               JSON.stringify(theError));
          navigator.mozApps.getSelf().onsuccess = function(evt) {
            var app = evt.target.result;
            var iconURL = NotificationHelper.getIconURI(app);
            NotificationHelper.send(_('facebook'), _('syncError'), iconURL);

          }
          setNextAlarm(false, fb.syncPeriod, window.close);
        break;
      }
    }

    // First is checked if this is a sync alarm
    if (message.data.sync === true &&
                              isSyncOngoing === false && navigator.onLine) {
      isSyncOngoing = true;
      fb.sync.debug('Starting sync at: ', new Date());

      // The next alarmid is removed
      window.asyncStorage.removeItem(ALARM_ID_KEY);

      fb.sync.start({
        success: syncSuccess,
        error: syncError
      });
    }
    else if (!navigator.onLine) {
      fb.sync.debug('Navigator is not online. Setting an alarm for next hour');
      setNextAlarm(false, 1);
    }
    else {
      fb.sync.debug('Alarm message but was not a sync message');
    }
  }

  function setNextAlarm(notifyParent, period, callback) {
    // Let's check whether there was a previous set alarm
    window.asyncStorage.getItem(ALARM_ID_KEY, function(data) {
      if (data) {
        // If there was a previous alarm it has to be removed
        fb.sync.debug('Removing existing alarm: ', data);
        navigator.mozAlarms.remove(Number(data));
      }

      doSetNextAlarm(notifyParent, period, callback);
    });
  }

  function doSetNextAlarm(notifyParent, hours, callback) {
    function alarmSetErrorCb() {
      if (notifyParent) {
        window.setTimeout(function() {
          parent.fb.sync.onAlarmError(req.error);
        },0);
      }
      else {
            window.console.error('<<FBSync>> Error while setting next alarm',
                               req.error);
      }
    }

    fb.utils.getLastUpdate(function(timestamp) {
      var nextUpdate = timestamp + hours * 60 * 60 * 1000;
      var scheduledDate = new Date(nextUpdate);

      fb.sync.debug('Going to set a new alarm at: ', scheduledDate);

      var req = navigator.mozAlarms.add(scheduledDate, 'honorTimezone', {
        sync: true
      });

      req.onsuccess = function() {
        // Set the last alarm id
        window.asyncStorage.setItem(ALARM_ID_KEY, String(req.result),
          function success() {
            if (notifyParent === true) {
              window.setTimeout(function() {
                parent.fb.sync.onAlarmScheduled(scheduledDate);
              },0);
            }

            fb.sync.debug('Alarm correctly set!!');

            if (typeof callback === 'function') {
              callback();
            }
        },
        function error() {
          alarmSetErrorCb();
        });
      }

      req.onerror = function() {
        alarmSetErrorCb();
      }

    }); // Get last update
  } // doSetNextAlarm

  // Everything starts
  Alarm.init();

})();
