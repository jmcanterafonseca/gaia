'use strict';

// Enabling workers
var self = this;

if (!window.Rest) {
  window.Rest = (function() {

    function RestRequest() {
      this.cancel = function() {
        if (typeof this.oncancel === 'function') {
          window.setTimeout(function() {
            this.oncancel();
          }.bind(this), 0);
        }
      };
    }

    function Rest() { }

    Rest.prototype = {
      get: function(uri, callback, pOptions) {
        var DEFAULT_TIMEOUT = 30000;
        var options = pOptions || {};

        var outReq = new RestRequest();
        var xhr = new XMLHttpRequest({
          mozSystem: true
        });

        // To enable xhr.abort if user cancels
        outReq.xhr = xhr;
        outReq.oncancel = function() {
          this.xhr.abort();
        };

        xhr.open('GET', uri, true);
        xhr.responseType = options.responseType || 'json';

        xhr.timeout = options.operationsTimeout || DEFAULT_TIMEOUT;

        xhr.onload = function(e) {
          if (xhr.status === 200 || xhr.status === 400 || xhr.status === 0) {
            if (callback && typeof callback.success === 'function')
              self.setTimeout(function() {
                callback.success(xhr.response);
              },0);
          }
          else {
            self.console.error('HTTP error executing GET. ',
                               uri, ' Status: ', xhr.status);
            if (callback && typeof callback.error === 'function')
              self.setTimeout(callback.error, 0);
          }
        }; // onload

        xhr.ontimeout = function(e) {
          self.console.error('Timeout!!! while HTTP GET: ', uri);
          if (callback && typeof callback.timeout === 'function')
            self.setTimeout(callback.timeout, 0);
        }; // ontimeout

        xhr.onerror = function(e) {
          self.console.error('Error while executing HTTP GET: ', uri,
                                   ': ', e);
          if (callback && typeof callback.error === 'function')
            self.setTimeout(function() {
              callback.error(e);
            },0);
        }; // onerror

        xhr.send();

        return outReq;
      }
    }; // get

    return new Rest();
  })();
}
