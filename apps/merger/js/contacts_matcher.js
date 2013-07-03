var contacts = window.contacts || {};

contacts.Matcher = (function() {
  var fields = ['tel', 'email'];

  function MatcherObj(telNumbers) {
    var next = 0;
    var self = this;
    var numbersToCheck = telNumbers;
    var results = {};

    function doMatchByTel(number, callbacks) {
      var options = {
        filterValue : number,
        filterBy    : ['tel'],
        filterOp    : 'match',
      };

      var req = navigator.mozContacts.find(options);

      req.onsuccess = function() {
        window.console.log('Results found: ', req.result.length);

        if(req.result.length >= 1) {
          typeof callbacks.onmatch === 'function' &&
                                                callbacks.onmatch(req.result);
        }
        else {
          typeof callbacks.onmismatch === 'function' && callbacks.onmismatch();
        }
      }

      req.onerror = function() {
        typeof callbacks.onmismatch === 'function' && callbacks.onmismatch();
      }
    }

    function carryOn() {
      next++;
      if(next < numbersToCheck.length) {
        doMatchByTel(numbersToCheck[next], callbacks);
      }
      else if(Object.keys(results).length > 0) {
        typeof self.onmatch === 'function' && self.onmatch(results);
      }
      else {
        typeof self.onmismatch === 'function' && self.onmismatch(results);
      }
    }

    function matched(contacts) {
      contacts.forEach(function(aContact) {
        results[aContact.id] = aContact;
      });

      carryOn();
    }

    var callbacks = {
      onmatch: matched,
      onmismatch: carryOn
    }

    this.start = function() {
      doMatchByTel(numbersToCheck[0], callbacks);
    }
  }

  function matchByTel(aContact, callbacks) {
    window.console.log(JSON.stringify(aContact));

    var values = [];

    aContact.tel.forEach(function(aTel) {
      values.push(aTel.value);
    });

    var matcher = new MatcherObj(values);
    matcher.onmatch = callbacks.onmatch;

    matcher.onmismatch = callbacks.onmismatch;

    matcher.start();
  }


  function matchByEmail(aContact, callbacks) {

  }

  function doMatch(aContact, callbacks) {
    window.console.log(JSON.stringify(aContact));
    matchByTel(aContact, callbacks);
  }

  return {
    match: doMatch,
  };
})();


var contact = {
  tel: [
    { type: 'mobile', value: '6388813076'}
  ]
};

var then = window.performance.now();

var callbacks = {
  onmatch: function(result) {
    window.console.log('Matching results: ', Object.keys(result).length);
    var now = window.performance.now();
    window.console.log('Time: ', now - then);
  },

  onmismatch: function() {
    window.console.log('Mismatch!!!!');
    var now = window.performance.now();
    window.console.log('Time: ', now - then);
  }
}

contacts.Matcher.match(contact, callbacks);
