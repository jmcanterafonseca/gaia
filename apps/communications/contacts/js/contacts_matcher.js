var contacts = window.contacts || {};

contacts.Matcher = (function() {
  // Matcher obj
  function MatcherObj(ptargets, pmatchingOptions) {
    var next = 0;
    var self = this;
    var targets = ptargets;
    var matchingOptions = pmatchingOptions;
    var finalMatchings = [];

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

        var filterBy = options.filterBy;

        matchings.forEach(function(aMatching) {
          var values = aMatching[options.filterBy[0]];
          window.console.log(JSON.stringify(values));
          var matchedValue;

          values.forEach(function(aValue) {
            var type = aValue.type;
            var value = aValue.value;

            if (value === target || value.indexOf(target) !== -1 ||
               target.indexOf(value) !== -1) {
              matchedValue = value;
            }

            // Only check for 'work' exception when matching by tel
            if (filterBy === 'email' || (Array.isArray(type) &&
                                         type.indexOf('work') === -1 &&
                type.indexOf('faxOffice') === -1) &&
                matchingOptions.selfContactId !== aMatching.id) {
              finalMatchings.push({
                target: target,
                field: filterBy,
                matchedValue: matchedValue,
                matchingContact: aMatching
              });
            }
          });
        });

        window.console.log('Final matchings length: ', finalMatchings.length);
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
      else if (finalMatchings.length > 0) {
        typeof self.onmatch === 'function' && self.onmatch(finalMatchings);
      }
      else {
        typeof self.onmismatch === 'function' && self.onmismatch();
      }
    }

    function matched(contacts) {
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

    if (Array.isArray(aContact.tel)) {
      aContact.tel.forEach(function(aTel) {
        if (isEligible(aTel)) {
          values.push(aTel.value);
        }
      });
    }

    if (values.length > 0) {
      var matcher = new MatcherObj(values, {
        filterBy: ['tel'],
        filterOp: 'match',
        selfContactId: aContact.id
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

    if (Array.isArray(aContact.email)) {
      aContact.email.forEach(function(aEmail) {
        values.push(aEmail.value);
      });
    }

    if (values.length > 0) {
      var matcher = new MatcherObj(values, {
        filterBy: ['email'],
        filterOp: 'equals',
        selfContactId: aContact.id
      });
      matcher.onmatch = callbacks.onmatch;

      matcher.onmismatch = callbacks.onmismatch;

      matcher.start();
    }
    else {
      typeof callbacks.onmismatch === 'function' && callbacks.onmismatch();
    }
  }

  function matchByName(aContact, callbacks) {
    var options = {
      filterValue: aContact.givenName[0],
      filterBy: ['familyName'],
      filterOp: 'equals'
    };

    var req = navigator.mozContacts.find(options);

    req.onsuccess = function() {
      var result = req.result;
      if (result.length > 0) {
        var givenNames = [];
        // Here we perform a binary search over the givenName
        result.forEach(function(aResult) {
          if (.)
        });
      }
      else {
        typeof callbacks.onmismatch === 'function' && callbacks.onmismatch();
      }
    };

    req.onerror = function() {
      window.console.error('Error while trying to perform matchinh by name',
                           req.error.name);
      typeof callbacks.onmismatch === 'function' && callbacks.onmismatch();
    };
  }

  function doMatch(aContact, callbacks) {
    window.console.log(JSON.stringify(aContact));
    var localCbs = {
      onmatch: function(telMatches) {
        var matchCbs = {
          onmatch: function(mailMatches) {
            // Have a unique set of matches
            var allMatches = telMatches;
            mailMatches.forEach(function(aMatch) {
              allMatches.push(aMatch);
            });
            typeof callbacks.onmatch === 'function' &&
              callbacks.onmatch(allMatches);
          },
          onmismatch: function() {
            typeof callbacks.onmismatch === 'function' &&
              callbacks.onmatch(telMatches);
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

  function doMatchSilent(aContact, callbacks) {
    var localCbs = {
      onmatch: function(nameMatches) {

      },
      onmismatch: function() {
        typeof callbacks.onmismatch === 'function' && callbacks.onmismatch();
      }
    };
    matchByName(aContact, localCbs);
  }

  return {
    matchActiveMode: doMatch,
    matchSilentMode: doMatchSilent
  };
})();
