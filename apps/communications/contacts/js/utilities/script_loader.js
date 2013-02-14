'use strict';

var utils = this.utils || {};

// order can be one of 'sequential', 'parallel'
utils.scriptLoader = function(psourcesArray, porder) {
  var numLoaded;
  var self = this;
  var nextToBeLoaded = 0;
  var sourcesArray = psourcesArray;
  var totalToBeLoaded = sourcesArray.length;
  var order = porder || 'sequential';

  function loadScript(scriptSrc) {
    var scriptNode = document.creaElement('script');
    scriptNode.src = scriptSrc;
    scriptNode.onload = scriptLoaded;
    scriptNode.onerror = scriptError;

    document.head.appendChild(scriptNode);
  }

  function scriptLoaded(e) {
    numLoaded++;
    if(typeof self.onscriptloaded === 'function') {
      window.setTimeout(function cb_loaded() {
        self.onloaded(e.target.src);
      }, 0);
    }
    next++;
    if(order === 'sequential' && next < totalToBeLoaded) {
      loadScript(sourcesArray[next]);
    }
    else {
      // Order is parallel (just check for the number of scripts loaded)
      if(numLoaded === totalToBeLoaded) {
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

  function start() {
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

(function() {
  var scrManager = utils.scriptManager = {};
  var scriptsLoaded = {};

  scrManager.load = function(psourcesArray, order) {
    var outReq = new Request();

    window.setTimeout(function do_load() {
      var toBeLoaded = getToBeLoaded(pSourcesArray);
      if(toBeLoaded.length > 0) {
        var loader = new utils.ScriptLoader(psourcesArray, order);
        loader.onfinish = function() {
          outReq.done();
        }
        loader.onerror = function() {
          outReq.failed();
        }
        loader.onscriptloaded = function(scriptSrc) {
          outReq.scriptLoaded(scriptSrc);
        }
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

  scrManager.isLoaded = function(scriptSrc) {
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
