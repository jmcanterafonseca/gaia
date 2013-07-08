var contacts = window.contacts || {};

contacts.Matcher = (function() {
  // Matcher obj
  function MatcherObj(ptargets, pmatchingOptions) {
    var next = 0;
    var self = this;
    var targets = ptargets;
    var matchingOptions = pmatchingOptions;
    var results = {};

    function doMatchBy(target, callbacks) {
      var options = {
        filterValue: target,
        filterBy: matchingOptions.filterBy,
        filterOp: matchingOptions.filterOp
      };

      var req = navigator.mozContacts.find(options);

      req.onsuccess = function() {
        var matchings = req.result;
        window.console.log('Results found for target ', target, ': ',
                           matchings.length);

        var finalMatchings = [];
        var filterBy = options.filterBy;

        matchings.forEach(function(aMatching) {
          var values = aMatching[options.filterBy[0]];
          window.console.log(JSON.stringify(values));
          values.forEach(function(aValue) {
            var type = aValue.type;
            var value = aValue.value;

            // Only check for work exception when matching by tel
            // TODO: Check for the real values
            if (filterBy === 'email' || (type && type.indexOf('work') === -1 &&
                type.indexOf('faxOffice') === -1)) {
              finalMatchings.push(aMatching);
            }
          });
        });

        if (finalMatchings.length > 0) {
          typeof callbacks.onmatch === 'function' &&
                                            callbacks.onmatch(finalMatchings);
        }
        else {
          typeof callbacks.onmismatch === 'function' && callbacks.onmismatch();
        }
      };

      req.onerror = function(e) {
        window.console.error('Error while trying to do the matching',
                             e.target.error.name);
        typeof callbacks.onmismatch === 'function' && callbacks.onmismatch();
      };
    }

    function carryOn() {
      next++;
      if (next < targets.length) {
        doMatchBy(targets[next], callbacks);
      }
      else if (Object.keys(results).length > 0) {
        typeof self.onmatch === 'function' && self.onmatch(results);
      }
      else {
        typeof self.onmismatch === 'function' && self.onmismatch();
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
    };

    this.start = function() {
      doMatchBy(targets[0], callbacks);
    };
  }

  function isEligible(aValue) {
    var out = false;

    var type = aValue.type;
    var value = aValue.value;

    if (type && type.indexOf('work') === -1 &&
                type.indexOf('faxOffice') === -1) {
      out = true;
    }

    return out;
  }

  function matchByTel(aContact, callbacks) {
    window.console.log(JSON.stringify(aContact));

    var values = [];

    aContact.tel.forEach(function(aTel) {
      if (isEligible(aTel)) {
        values.push(aTel.value);
      }
    });

    if (values.length > 0) {
      var matcher = new MatcherObj(values, {
        filterBy: ['tel'],
        filterOp: 'match'
      });
      matcher.onmatch = callbacks.onmatch;

      matcher.onmismatch = callbacks.onmismatch;

      matcher.start();
    }
    else {
      typeof callbacks.onmismatch === 'function' && callbacks.onmismatch();
    }
  }


  function matchByEmail(aContact, callbacks) {
    var values = [];

    aContact.email.forEach(function(aEmail) {
      values.push(aEmail.value);
    });

    if (values.length > 0) {
      var matcher = new MatcherObj(values, {
        filterBy: ['email'],
        filterOp: 'equals'
      });
      matcher.onmatch = callbacks.onmatch;

      matcher.onmismatch = callbacks.onmismatch;

      matcher.start();
    }
  }

  function doMatch(aContact, callbacks) {
    window.console.log(JSON.stringify(aContact));
    var localCbs = {
      onmatch: function(telMatches) {
        var matchCbs = {
          onmatch: function(mailMatches) {
            // Have a unique set of matches
            var allMatches = telMatches;
            Object.keys(mailMatches).forEach(function(aMatchId) {
              if (!allMatches[aMatchId]) {
                allMatches[aMatchId] = mailMatches[aMatchId];
              }
            });
            typeof callbacks.onmatch === 'function' &&
              callbacks.onmatch(allMatches);
          },
          onmismatch: function() {
            typeof callbacks.onmismatch === 'function' &&
              callbacks.onmismatch();
          }
        };
        matchByEmail(aContact, matchCbs);
      },
      onmismatch: function() {
        matchByEmail(aContact, callbacks);
      }
    };
    matchByTel(aContact, localCbs);
  }

  return {
    match: doMatch
  };
})();


var contact = {
  tel: [
    { type: 'mobile', value: '638883076'},
    { type: 'mobile', value: '616865982'}
  ],
  email: [
    { type: 'personal', value: 'jj@jj.com' }
  ]
};


var then = window.performance.now();

var callbacks = {
  onmatch: function(result) {
    window.console.log('Matching results: ', Object.keys(result).length);
    Object.keys(result).forEach(function(aResultId) {
      window.console.log('Result: ', JSON.stringify(result[aResultId].tel),
                         JSON.stringify(result[aResultId].email));
    });
    var now = window.performance.now();
    window.console.log('Time: ', now - then);
  },

  onmismatch: function() {
    window.console.log('Mismatch!!!!');
    var now = window.performance.now();
    window.console.log('Time: ', now - then);
  }
};

contacts.Matcher.match(contact, callbacks);
