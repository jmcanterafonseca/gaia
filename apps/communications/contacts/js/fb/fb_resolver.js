'use strict';

var fb = this.fb || {};

fb.resolver = function(item, loader) {
  var status = item.dataset.status;
  var isFbContact = 'fbUid' in item.dataset;

  if (isFbContact && status !== 'pending' && status !== 'loaded') {
    var fbReq = fb.contacts.get(item.dataset.fbUid);
    item.dataset.status = 'pending';

    fbReq.onsuccess = function() {
      var photo = fbReq.result.photo;
      if(photo && photo[0]) {
        var photoTemplate = document.createElement('aside');
        photoTemplate.className = 'pack-end';
        var image = document.createElement('img');
        photoTemplate.appendChild(image);
        image.dataset.src = window.URL.createObjectURL(photo[0]);
        item.firstElementChild.insertBefore(photoTemplate,
                                  item.firstElementChild.firstElementChild);
        item.dataset.status = 'loaded';
        document.dispatchEvent(new CustomEvent('onupdate'));
      }
      else {
        item.dataset.status = 'loaded';
      }
    }

    fbReq.onerror = function() {
      item.dataset.status = 'error';
    }
  }
  else if(status === 'loaded' || !isFbContact) {
    loader.defaultLoad(item);
  }
}
