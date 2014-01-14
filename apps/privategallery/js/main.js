'use strict';

window.console.log('main.js loaded ...');

var inActivity = false;
var activity;

if (!navigator.mozHasPendingMessage('activity')) {
  togglePick();
  Gallery.start();
  navigator.mozSetMessageHandler('activity', handleActivity);
}
else {
  navigator.mozSetMessageHandler('activity', handleActivity);
}

var PRIVATE_GALLERY_SERVICE = 'http://5.255.150.180/upload_media';

function toggleUpload() {
  document.querySelector('#upload').classList.remove('hide');
  document.querySelector('#gallery-list').classList.add('hide');
  document.querySelector('section.empty').style.opacity = 0;
}

function togglePick() {
  document.querySelector('#upload').classList.add('hide');
  document.querySelector('#gallery-list').classList.remove('hide');
  document.querySelector('section.empty').style.opacity = 0;
}

function handleActivity(activityRequest) {
  inActivity = true;
  activity = activityRequest;

  window.console.log('In handle activity ...');

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

  if (activityRequest.source.name === 'pick') {
    togglePick();
    return;
  }

  if (options.name === 'share') {
    window.console.log('Handling share activity ...');
    toggleUpload();
    uploadContent(options.data.blobs[0], access_token, function(newMediaId) {
      togglePick();
      Gallery.refresh(newMediaId);
      activityRequest.postResult({
        success: true
      });
      inActivity = false;
    });
  }
}

function uploadContent(blob, access_token, done) {
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
        var notif = new Notification('Cloud Gallery', {
          body: 'Photo has been uploaded'
        });
        done(fileName);
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
