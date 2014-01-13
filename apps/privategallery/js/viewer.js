'use strict';

var Gallery = (function() {
  var GALLERY_SERVER = 'http://5.255.150.180';
  var LIST_MEDIA_URI = GALLERY_SERVER + '/' + 'list_media_fast';
  var MEDIA_URI = GALLERY_SERVER + '/' + 'media';
  var ALBUMS_URI = GALLERY_SERVER + '/' + 'list_albums';

  var list = document.querySelector('ul.gallery');
  var backButton = document.getElementById('back');
  var gallerySection = document.querySelector('#gallery-list');
  var mediaDetail = document.querySelector('#gallery-detail');
  var imgNode = mediaDetail.querySelector('img');
  var progressActivity = mediaDetail.querySelector('progress');
  var currentMediaId;

  var numImgsLoaded = 0;
  var totalMedia = 0;

  var access_token;

  function tokenReady(cb, token) {
    access_token = token;
    cb(token);
  }

  function getToken(cb, errorCb) {
    window.asyncStorage.getItem('userData', function(data) {
      if (!data) {
        oauth.flow.start(function(token) {
          window.asyncStorage.setItem('userData', token, function() {
            console.log('Token stored correctly');
          });
          tokenReady(cb, token);
        });
        return;
      }
      tokenReady(cb, data);
    }, errorCb);
  }

  function listMedia(access_token, cb, errorCb) {
    Rest.get(LIST_MEDIA_URI + '?access_token=' + access_token, {
      success: function(response) {
        cb(response.data);
      },
      error: errorCb
    }, {
        operationsTimeout: 10000
    });
  }

  function onLoadImg() {
    numImgsLoaded++;
    if (numImgsLoaded === totalMedia) {
      removeProgressActivity('#gallery-list');
    }
  }

  function removeProgressActivity(section) {
    var sct = document.querySelector(section);
    var progress = sct.querySelector('progress');
    progress.style.display = 'none';
  }

  function buildImageNode(access_token, src) {
    var li = document.createElement('li');
    li.dataset.media = src;
    var img = document.createElement('img');
    img.onload = onLoadImg;
    img.onerror = onLoadImg;
    li.appendChild(img);
    img.src = MEDIA_URI + '/' + src + '?access_token=' + access_token +
    '&th=1';

    return li;
  }

  function renderGallery(access_token, done) {
    listMedia(access_token, function(mediaList) {
      totalMedia = mediaList.length;
      mediaList.forEach(function(aMedia) {
        list.appendChild(buildImageNode(access_token, aMedia));
      });
      done();
    }, function error() {
        console.error('Error while listing media');
    });
  }

  function goBack() {
    mediaDetail.addEventListener('transitionend', function tend() {
      mediaDetail.removeEventListener('transitionend', tend);
      mediaDetail.classList.remove('right-to-left');
      mediaDetail.classList.remove('back-to-right');
      mediaDetail.classList.add('hidden');
      imgNode.removeAttribute('src');
    });

    mediaDetail.classList.add('back-to-right');
  }

  function showMedia(e) {
    var target = e.target;
    mediaDetail.classList.add('right-to-left');
    mediaDetail.classList.remove('hidden');

    progressActivity.style.display = '';

    var media = target.dataset.media;
    currentMediaId = media;

    imgNode.onload = function() {
      progressActivity.style.display = 'none';
    };
    imgNode.src = getMediaUrl(media);
  }

  function getMediaUrl(media) {
    return MEDIA_URI + '/' + media + '?access_token=' + access_token;
  }

  function deleteMedia(e) {
    ConfirmDialog.show('Media Gallery',
                       'Are you sure you want do delete this media?', {
                          title: 'Cancel',
                          isDanger: false,
                          callback: function() {
                            ConfirmDialog.hide();
                          }
                        },
                        {
                          title: 'Delete',
                          isDanger: true,
                          callback: function() {
                            doDeleteMedia();
                            ConfirmDialog.hide();
                          }
                        }
    );

  }

  function doDeleteMedia() {
    progressActivity.style.display = '';
    var mediaId = currentMediaId;
    imgNode.style.opacity = 0.2;
    Rest.get(getMediaUrl(mediaId), {
      success: mediaRemoved,
      error: function() {
        console.error('Error while deleting media');
      }
    },{
        operationsTimeout: 10000,
        method: 'DELETE'
    });
  }

  function mediaRemoved() {
    var ele = document.querySelector('li[data-media="' + currentMediaId + '"]');
    list.removeChild(ele);
    currentMediaId = null;
    alert('Media Removed!');
    goBack();
  }

  function sendMedia() {
    var uri = ALBUMS_URI + '?access_token=' + access_token;
    Rest.get(uri, {
      success: function(result) {
        var actionMenuOptions = {
          id: 'albums',
          title: 'Choose a Facebook Album',
          actions: []
        };
        result.forEach(function(aAlbum) {
          actionMenuOptions.actions.push({
            id: aAlbum.id,
            title: aAlbum.name
          });
        });
        actionMenuOptions.actions.push({
          id: 'cancel',
          title: 'Cancel'
        });

        var albumsElement = utils.ActionMenu.create(actionMenuOptions);
        document.body.appendChild(albumsElement);

        var albumsAction = utils.ActionMenu.bind(albumsElement);
        albumsAction.show();
      },
      error: function() {
        alert('error');
      }
    },{
        operationsTimeout: 10000
    });
  }

  function start() {
    list.addEventListener('click', showMedia);
    backButton.addEventListener('click', goBack);
    document.querySelector('#delete').addEventListener('click', deleteMedia);
    document.querySelector('#send').addEventListener('click', sendMedia);

    numImgsLoaded = 0;
    totalMedia = 0;

    getToken(function(access_token) {
      renderGallery(access_token, function() {
        console.log('Gallery rendered');
      });
    }, function err() {
        console.log('There has been an error');
    });
  }

  return {
    'start': start
  };
})();

Gallery.start();
