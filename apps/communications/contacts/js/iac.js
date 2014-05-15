'use strict';

var FTUConnectionHandler = (function() {
  // Executes when a new message from the FTU arrives
  function onMessage(event) {
    var data = event.data;

    // The Facebook access token
    var tokenData = data.tokenData;
    var totalFriends = data.totalFriends;
    var importedFriends = data.importedFriends;

    fb.utils.setCachedNumFriends(totalFriends, function done1() {
      fb.utils.setCachedAccessToken(tokenData, function done2() {
        fb.utils.setLastUpdate(Date.now(), function done3() {
          var req = fb.sync.scheduleNextSync();
          req.onsuccess = function scheduleSuccess() {
            // We introduce a 5 second delay to allow to consolidate all
            // the operations
            window.setTimeout(window.close, 5000);
          };
        });
      });
    });
  }

  return {
    'onMessage': onMessage
  }
}());


navigator.mozSetMessageHandler('connection', function(connectionRequest) {
  if (connectionRequest.keyword !== 'ftu-connection') {
    return;
  }

  console.log('Connection Request from FTU');

  var port = connectionRequest.port;
  port.onmessage = FTUConnectionHandler.onMessage;
  port.start();
});
