'use strict';

var FTUConnectionHandler = (function() {
  function onMessage(data) {
    // The Facebook access token
    var tokenData = data.tokenData;
    var totalFriends = data.totalFriends;
    var importedFriends = data.importedFriends;
    
    fb.utils.setCachedNumFriends(numFriends);
    fb.utils.setCachedAccessToken(tokenData, function() {
      console.log('Access token data has been properly saved');
      window.setTimeout(window.close, 5000);
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
