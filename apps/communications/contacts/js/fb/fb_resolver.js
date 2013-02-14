'use strict';

var fb = this.fb || {};

fb.resolver = function(item, loader) {
  var fbUid = item.dataset.fbUid;
  var status = item.dataset.status;

  if (fbUid && status !== 'pending' && status !== 'loaded') {
    var fbUid = item.dataset.fbUid;
    var fbReq = fb.contacts.get(fbUid);
    item.dataset.status = 'pending';

    fbReq.onsuccess = function() {
      if(fbReq.result.photo && fbReq.result.photo[0]) {
        var photoTemplate = document.createElement('aside');
        photoTemplate.className = 'pack-end';
        var image = document.createElement('img');
        photoTemplate.appendChild(image);
        image.dataset.src = window.URL.createObjectURL(fbReq.result.photo[0]);
        item.firstElementChild.insertBefore(photoTemplate,
                                  item.firstElementChild.firstElementChild);
        item.dataset.status = 'loaded';
        loader.update();
      }
      else {
        item.dataset.status = 'loaded';
      }
    }

    fbReq.onerror = function() {
      item.dataset.status = 'error';
    }
  }
  else if(status === 'loaded') {
    loader.defaultLoad(item);
  }
}
