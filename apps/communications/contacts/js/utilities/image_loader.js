'use strict';

if (!window.ImageLoader) {
  var ImageLoader = function ImageLoader(pContainer, pItems) {
    var container, items, itemsSelector, scrollLatency = 100, scrollTimer,
        lastViewTop = 0, itemHeight, total, imgsLoading = 0;

    var forEach = Array.prototype.forEach;

    init(pContainer, pItems);

    /**
     *  Initializer
     *
     */
    function init(pContainer, pItems) {
      itemsSelector = pItems;
      container = document.querySelector(pContainer);

      container.addEventListener('scroll', onScroll);
      document.addEventListener('onupdate', function(evt) {
        evt.stopPropagation();
        onScroll();
      });

      load();
    }

    function load() {
      window.clearTimeout(scrollTimer);
      items = container.querySelectorAll(itemsSelector);
      // All items have the same height
      itemHeight = items[0] ? items[0].offsetHeight : 1;
      total = items.length;
      // Initial check if items should appear
      window.setTimeout(update, 0);
    }

    function onScroll() {
      window.clearTimeout(scrollTimer);
      if (imgsLoading > 0) {
        // Stop the pending images load
        window.stop();
        imgsLoading = 0;
      }
      scrollTimer = window.setTimeout(update, scrollLatency);
    }

    function doImageLoad(item, imgNode) {
       ++imgsLoading;
      var tmp = new Image();
      var src = tmp.src = imgNode.dataset.src;
      tmp.onload = function onload() {
        --imgsLoading;
        imgNode.src = src;
        if (tmp.complete) {
          item.dataset.visited = 'true';
        }
        tmp = null;
      };

      tmp.onabort = tmp.onerror = function onerror() {
        item.dataset.visited = 'false';
        tmp = null;
      }
    }

    /**
     *  Loads the image contained in a DOM Element.
     */
    function loadImage(item) {
      if (!item.dataset.visited && item.dataset.fbUid) {
        var fbUid = item.dataset.fbUid;
        var fbReq = fb.contacts.get(fbUid);

        item.dataset.visited = true;
        fbReq.onsuccess = function() {
          if(fbReq.result.photo && fbReq.result.photo[0]) {
            var photoTemplate = document.createElement('aside');
            photoTemplate.className = 'pack-end';
            image = document.createElement('img');
            photoTemplate.appendChild(image);
            image.dataset.src = window.URL.createObjectURL(fbReq.result.photo[0]);
            item.firstElementChild.insertBefore(photoTemplate, item.firstElementChild.firstElementChild);
            doImageLoad(item, image);
          }
          else {
            item.dataset.visited = true;
          }
        }

        fbReq.onerror = function() {

        }
      }
      else if(!item.dataset.visited) {
        var image = item.querySelector('img[data-src]');
        if(image) {
          doImageLoad(item, image);
        }
      }
    }

    /**
     *  Calculates the set of items are in the current viewport
     *
     */
    function update() {
      if (total === 0) {
        return;
      }

      var viewTop = container.scrollTop;
      // Index is always inside or below viewport
      var index = Math.floor(viewTop / itemHeight);
      var containerHeight = container.offsetHeight;

      // Goes backward
      for (var i = index; i >= 0; i--) {
        var item = items[i];
        if (item) {
          if (item.offsetTop + itemHeight < viewTop) {
            break; // Over
          }

          if (item.dataset.visited !== 'true' &&
              item.offsetTop <= viewTop + containerHeight) {
            loadImage(item); // Inside
          }
        }
      }

      // Goes forward
      for (var j = index + 1; j < total; j++) {
        var item = items[j];
        if (!item) {
          // Returning because of index out of bound
          return;
        }

        if (item.offsetTop > viewTop + containerHeight) {
          return; // Below
        }

        if (item.dataset.visited !== 'true') {
          loadImage(item);
        }
      }
    } // update

    this.reload = load;
  };
}
