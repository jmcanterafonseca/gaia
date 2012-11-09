'use strict';

var fb = window.fb || {};
var Sync = fb.sync || {};
fb.sync = Sync;

(function() {
  var Alarm = Sync.alarm = {};

  var ALARM_ID_KEY = fb.utils.ALARM_ID_KEY;
  var isSyncOngoing = false;
  var _ = navigator.mozL10n.get;

  // This is the amount of hours to wait to retry a sync operation
  var DEFAULT_RETRY_PERIOD = 1;
  // Delay in closing the window
  var CLOSE_DELAY = 5000;

  Alarm.init = function() {
    fb.init(function fb_alarm_init() {
      if (navigator.mozHasPendingMessage('alarm')) {
        fb.sync.debug('Alarm System Message Received!!!!!');
        navigator.mozSetMessageHandler('alarm', handleAlarm);
      }
      // Workaround for Gecko Bug. mozHasPendingMessage does not work
      // https://bugzilla.mozilla.org/show_bug.cgi?id=802876
      else if (parent.location === window.location) {
        fb.sync.debug('Fb Sync woke up. Alarm ok. mozHasPendingMsg failed');
        handleAlarm({
          data: {
            sync: true
          }
        });
      }
      else {
        setNextAlarm(true, fb.syncPeriod);
      }
    }); // fb.init
  } // Alarm.init

  function syncSuccess() {
    fb.sync.debug('Sync finished ok at ', new Date());
    isSyncOngoing = false;

    doSetNextAlarm(false, fb.syncPeriod, function() {
      fb.sync.debug('Closing the app that did the sync');
      closeApp();
    });
  } // syncSuccess function

  function syncError(error) {
    isSyncOngoing = false;
    var theError = error;

    if (!theError) {
      theError = {
        type: 'default'
      };
    }

    switch (theError.type) {
      case 'timeout':
        fb.sync.debug('Timeout error. Setting an alarm for next hour');
        doSetNextAlarm(false, DEFAULT_RETRY_PERIOD, closeApp);
      break;

      case 'invalidToken':
        fb.sync.debug('Invalid token!!!. Notifying the user');
        // A new alarm is not set. It will be set once the user
        // logs in Facebook one more time
        showNotification({
          title: _('facebook'),
          body: _('notificationLogin'),
          iconURL: '/contacts/style/images/f_logo.png',
          callback: closeApp
        });
      break;

      default:
        window.console.error('Error reported in synchronization: ',
                             JSON.stringify(theError));
        showNotification({
          title: _('facebook'),
          body: _('syncError'),
          iconURL: '/contacts/style/images/f_logo.png',
          callback: function() {
            doSetNextAlarm(false, fb.syncPeriod, closeApp);
          }
        });
      break;
    }
  } // syncError function


  function handleAlarm(message) {
    // First is checked if this is a sync alarm
    if (message.data && message.data.sync === true &&
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
    else if (isSyncOngoing === true) {
      fb.sync.debug('There is an ongoing synchronization. Trying it later');
      setNextAlarm(false, DEFAULT_RETRY_PERIOD);
    }
    else if (!navigator.onLine) {
      fb.sync.debug('Navigator is not online. Setting an alarm for next hour');
      setNextAlarm(false, DEFAULT_RETRY_PERIOD);
    }
    else {
      fb.sync.debug('Alarm message but apparently was not a sync message');
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

  function alarmSetErrorCb(e) {
    if (notifyParent) {
      window.setTimeout(function() {
        parent.fb.sync.onAlarmError(e.target.error);
      },0);
    }
    else {
          window.console.error('<<FBSync>> Error while setting next alarm: ',
                             e.target.error);
    }
  }

  function doSetNextAlarm(notifyParent, hours, callback) {
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
          function success_alarm_id() {
            if (notifyParent === true) {
              window.setTimeout(function() {
                parent.fb.sync.onAlarmScheduled(scheduledDate);
              },0);
            }

            fb.sync.debug('--> Next Sync will happen at: ', scheduledDate);

            if (typeof callback === 'function') {
              callback();
            }
        },
        function error_alarm_id(e) {
          var errorParam = {
            target: {
              error: e || {
                name: 'AsyncStorageError'
              }
            }
          };
          alarmSetErrorCb(errorParam);
        });
      }

      req.onerror = function(e) {
        alarmSetErrorCb(e);
      }

    }); // Get last update
  } // doSetNextAlarm

  function showNotification(params) {
    navigator.mozApps.getSelf().onsuccess = function(evt) {
      var app = evt.target.result;
      var iconURL = app.installOrigin + params.iconURL;
      NotificationHelper.send(params.title, params.body, iconURL);

      if (typeof params.callback === 'function') {
        params.callback();
      }
    }
  }

  function closeApp() {
    // Wait some seconds to avoid any kind of race condition or console error
    window.setTimeout(window.close, CLOSE_DELAY);
  }

  // Everything starts
  Alarm.init();

})();
