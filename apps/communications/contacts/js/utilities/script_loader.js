'use strict';

var utils = this.utils || {};

(function() {
  var scr = utils.script = {};
  // order can be one of 'sequential', 'parallel'
  utils.script.Loader = function(psourcesArray, porder) {
    var numLoaded = 0;
    var self = this;
    var nextToBeLoaded = 0;
    var sourcesArray = psourcesArray;
    var totalToBeLoaded = sourcesArray.length;
    var order = porder || 'paralell';

    function loadScript(scriptSrc) {
      var scriptNode = document.createElement('script');
      scriptNode.src = scriptSrc;
      scriptNode.onload = scriptLoaded;
      scriptNode.onerror = scriptError;

      document.head.appendChild(scriptNode);
      window.console.log(scriptSrc);
    }

    function scriptLoaded(e) {
      window.console.log('script loaded', e.target.src);
      numLoaded++;
      if(typeof self.onscriptloaded === 'function') {
        window.setTimeout(function cb_loaded() {
          self.onscriptloaded(e.target.src);
        }, 0);
      }
      nextToBeLoaded++;
      if(order === 'sequential' && nextToBeLoaded < totalToBeLoaded) {
        loadScript(sourcesArray[nextToBeLoaded]);
      }
      else {
        window.console.log(nextToBeLoaded + "," + numLoaded + "," + totalToBeLoaded);
        // Order is parallel (just check for the number of scripts loaded)
        if(numLoaded === totalToBeLoaded) {
          window.console.log('all loaded');
          if(typeof self.onfinish === 'function') {
            window.setTimeout(self.onfinish, 0);
          }
        }
      }
    }

    function scriptError(e) {
      if(typeof self.onerror === 'function') {
        window.setTimeout(function cb_error() {
          self.onerror(e.target.src);
        }, 0);
      }
    }

    this.start = function() {
      if(order === 'sequential') {
        loadScript(sourcesArray[0]);
      }
      else {
        // All of them are loaded in parallel
        sourcesArray.forEach(function(aSource) {
          loadScript(aSource);
        });
      }
    }
  }


  var scriptsLoaded = {};

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
        loader.onscriptloaded = function(scriptSrc) {
          scriptsLoaded[scriptSrc] = true;
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
      if(scriptsLoaded[aSource] !== true) {
        realToBeLoaded.push(aSource);
      }
    });

    return realToBeLoaded;
  }

  utils.script.isLoaded = function(scriptSrc) {
    return scriptsLoaded[scriptSrc] === true;
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


