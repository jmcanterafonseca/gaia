'use strict';

window.console.log('main.js loaded ...');
navigator.mozSetMessageHandler('activity', handleActivity);

var PRIVATE_GALLERY_SERVICE = 'http://5.255.150.180/upload_media';

function handleActivity(activityRequest) {
  window.asyncStorage.getItem('userData', function(data) {
    if (!data) {
      oauth.flow.start(function(token) {
        window.asyncStorage.setItem('userData', token, function() {
          window.console.log('Token stored!!!');
        });

        doHandleActivity(activityRequest, token);
      });
    }
    else {
      window.console.log('Token already available: ', data);
      doHandleActivity(activityRequest, data);
    }
  });
}

function doHandleActivity(activityRequest, access_token) {
  var options = activityRequest.source;

  if (options.name === 'share') {
    window.console.log('Handling share activity ...');
    uploadContent(options.data, access_token, function() {
      activityRequest.postResult({
        success: true
      });
    });
  }
}

function uploadContent(content, access_token, done) {
  window.console.log('Content: ', JSON.stringify(content));

  var blob = content.blobs[0];
  var blobUrl = window.URL.createObjectURL(blob);
  var fileName = blobUrl.substring(blobUrl.indexOf(':') + 1);
  var url = PRIVATE_GALLERY_SERVICE + '?access_token=' + access_token +
  '&' + 'file_name=' + encodeURIComponent(fileName);

  var img = new Image();
  img.src = blobUrl;
  img.onload = function() {
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = 106;
    var context = canvas.getContext('2d');
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    console.log('Image drawn to canvas');
    canvas.toBlob(function(thumbnail) {
      var uploader = new MediaUploader(url, blob, thumbnail);

      uploader.onfinish = function() {
        window.console.log('Uploaded correctly !!!');
        var notif = new Notification('PrivateGallery', {
          body: 'Photo has been uploaded'
        });
        done();
      };

      uploader.onerror = function(e) {
        window.console.error('Error while uploading!!!', e);
      };

      uploader.onprogress = function() {
        window.console.info('Progress ... !');
      };

      uploader.start();
      window.URL.revokeObjectURL(blobUrl);
    });
  };
}
