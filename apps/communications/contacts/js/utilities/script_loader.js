'use strict';

var utils = this.utils || {};

(function() {
  var scr = utils.script = {};
  // order can be one of 'sequential', 'concurrent'
  utils.script.Loader = function(psourcesArray, porder) {
    var numLoaded = 0;
    var self = this;
    var nextToBeLoaded = 0;
    var sourcesArray = psourcesArray;
    var totalToBeLoaded = sourcesArray.length;
    var order = porder || 'concurrent';

    function loadScript(scriptSrc) {
      var scriptNode = document.createElement('script');
      scriptNode.src = scriptSrc;
      scriptNode.addEventListener('load', resourceLoaded);
      scriptNode.addEventListener('error', resourceError);

      document.head.appendChild(scriptNode);
    }

    function loadStyle(styleSrc) {
      var styleNode = document.createElement('link');
      styleNode.href = styleSrc;
      styleNode.rel = 'stylesheet';
      styleNode.type = 'text/css';

      styleNode.addEventListener('load',resourceLoaded);
      styleNode.addEventListener('error',resourceError);
      document.head.appendChild(styleNode);
    }

    function loadResource(resourceSrc) {
      var extension = resourceSrc.match(/\.(.*?)$/)[1];
      if(extension === 'js') {
        var node = document.head.querySelector('script[src=' + '"' +
                                               resourceSrc + '"]');
        if(node) {
          node.addEventListener('load',resourceLoaded);
          node.addEventListener('error', resourceError);
        }
        else {
          loadScript(resourceSrc);
        }
      }
      else if(extension === 'css') {
        var node = document.head.querySelector('link[href=' + '"'
                                               + resourceSrc + '"]');
        if(node) {
          node.addEventListener('load',resourceLoaded);
          node.addEventListener('error', resourceError);
        }
        else {
          loadStyle(resourceSrc);
        }
      }
    }

    function resourceLoaded(e) {
      e.target.removeEventListener('error',resourceLoaded);
      e.target.removeEventListener('load',resourceError);
      numLoaded++;
      if(typeof self.onresourceloaded === 'function') {
        window.setTimeout(function cb_loaded() {
          self.onresourceloaded(e.target.src);
        }, 0);
      }
      nextToBeLoaded++;
      if(order === 'sequential' && nextToBeLoaded < totalToBeLoaded) {
        loadResource(sourcesArray[nextToBeLoaded]);
      }
      else {
        // Order is concurrent (just check for the number of resources loaded)
        if(numLoaded === totalToBeLoaded) {
          if(typeof self.onfinish === 'function') {
            window.setTimeout(self.onfinish, 0);
          }
        }
      }
    }

    function resourceError(e) {
      e.target.removeEventListener('error',resourceLoaded);
      e.target.removeEventListener('load',resourceError);
      if(typeof self.onerror === 'function') {
        window.setTimeout(function cb_error() {
          self.onerror(e.target.src);
        }, 0);
      }
    }

    this.start = function() {
      if(order === 'sequential') {
        loadResource(sourcesArray[0]);
      }
      else {
        // All of them are loaded concurrently
        sourcesArray.forEach(function(aSource) {
          loadResource(aSource);
        });
      }
    }
  }


  var resourcesLoaded = {};

  utils.script.load = function(psourcesArray, order) {
    var outReq = new Request();

    window.setTimeout(function do_load() {
      var toBeLoaded = getToBeLoaded(psourcesArray);
      if(toBeLoaded.length > 0) {
        var loader = new utils.script.Loader(toBeLoaded, order);
        loader.onfinish = function() {
          outReq.done();
        }
        loader.onerror = function() {
          outReq.failed();
        }
        loader.onresourceloaded = function(scriptSrc) {
          resourcesLoaded[scriptSrc] = true;
          outReq.scriptLoaded(scriptSrc);
        }
        loader.start();
      }
      else {
        outReq.done();
      }
    }, 0);

    return outReq;
  }

  function getToBeLoaded(requestedSources) {
    var realToBeLoaded = [];

    requestedSources.forEach(function(aSource) {
      if(resourcesLoaded[aSource] !== true) {
        realToBeLoaded.push(aSource);
      }
    });

    return realToBeLoaded;
  }

  utils.script.isLoaded = function(scriptSrc) {
    return resourcesLoaded[scriptSrc] === true;
  }

  /**
  *   Request auxiliary object to support asynchronous calls
  *
  */
  var Request = function() {
    this.done = function(result) {
      this.result = result;
      if (typeof this.onsuccess === 'function') {
        var ev = {};
        ev.target = this;
        window.setTimeout(function() {
          this.onsuccess(ev);
        }.bind(this), 0);
      }
    };

    this.scriptLoaded = function(scriptSrc) {
      this.scriptSrc = scriptSrc;
      if(typeof this.onscriptloaded === 'function') {
        var ev = {};
        ev.target = this;
        window.setTimeout(function() {
          this.onscriptloaded(ev);
        }.bind(this), 0);
      }
    }

    this.failed = function(error) {
      this.error = error;
      if (typeof this.onerror === 'function') {
        var ev = {};
        ev.target = this;
        window.setTimeout(function() {
          this.onerror(ev);
        }.bind(this), 0);
      }
    };
  };
})();
