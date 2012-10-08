'use strict';

var fb = this.fb || {};
var _ConsoleObject = function() {

  function getString(a) {
    var out = '';
    for(var c= 0; c < a.length; c++) {
      out+= a[c];
    }

    return out;
  }

  this.error = function() {

    self.postMessage({
      type: 'error',
      data: getString(arguments)
    });
  }

  this.log = function() {
    self.postMessage({
      type: 'trace',
      data: getString(arguments)
    });
  }
}

// In an only worker execution context this would not be necessary
var self = this;
fb.utils = this.fb.utils || {};
this.console = this.console || new _ConsoleObject();

// Runs a query against Facebook FQL. Callback is a string!!
fb.utils.runQuery = function(query, callback, access_token) {
  var queryService = 'https://graph.facebook.com/fql?q=';
  queryService += encodeURIComponent(query);

  var params = ['access_token' + '=' + access_token,
                  'format=json'];

  var queryParams = params.join('&');

  var remote = queryService + '&' + queryParams;

  var xhr = new XMLHttpRequest({
    mozSystem: true
  });

  xhr.open('GET', remote, true);
  xhr.responseType = 'json';

  xhr.timeout = fb.operationsTimeout || 30000;

  xhr.onload = function(e) {
    if (xhr.status === 200 || xhr.status === 0) {
      if (callback && typeof callback.success === 'function')
        callback.success(xhr.response);
    }
    else {
      self.console.error('FB: Error executing query. Status: ',
                           xhr.status);
      if (callback && typeof callback.error === 'function')
        callback.error();
    }
  }

  xhr.ontimeout = function(e) {
    self.console.error('FB: Timeout!!! while executing query', query);
    if (callback && typeof callback.timeout === 'function')
      callback.timeout();
  }

  xhr.onerror = function(e) {
    self.console.error('FB: Error while executing query', e);
    if (callback && typeof callback.error === 'function')
      callback.error();
  }

  xhr.send();
}
