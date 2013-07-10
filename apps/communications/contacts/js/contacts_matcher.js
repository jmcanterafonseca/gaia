var contacts = window.contacts || {};

contacts.Matcher = (function() {
  // Matcher obj
  function MatcherObj(ptargets, pmatchingOptions) {
    var next = 0;
    var self = this;
    var targets = ptargets;
    var matchingOptions = pmatchingOptions;
    var finalMatchings = {};

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

            if (matchingOptions.selfContactId !== aMatching.id) {
              finalMatchings[aMatching.id] = {
                target: target,
                field: filterBy,
                matchedValue: matchedValue,
                matchingContact: aMatching
              };
            }
          });
        });

        var numFinalMatchings = Object.keys(finalMatchings).length;
        window.console.log('Final matchings length: ', numFinalMatchings);
        if (numFinalMatchings > 0) {
          window.console.log('Calling on match');
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
      else if (Object.keys(finalMatchings).length > 0) {
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
    window.console.log('aContact Data: ', JSON.stringify(aContact));

    var values = [];

    if (Array.isArray(aContact.tel)) {
      aContact.tel.forEach(function(aTel) {
        values.push(aTel.value);
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
    if (!Array.isArray(aContact.familyName) ||
    !Array.isArray(aContact.givenName) || !aContact.familyName[0] ||
    !aContact.givenName[0]) {

      typeof callbacks.onmistmatch === 'function' && callbacks.onmismatch();

      return;
    }

    var options = {
      filterValue: aContact.familyName[0],
      filterBy: ['familyName'],
      filterOp: 'equals'
    };

    var req = navigator.mozContacts.find(options);

    req.onsuccess = function() {
      var familyNameResults = req.result;
      if (familyNameResults.length > 0) {
        var givenNames = [];
        // Here we perform a binary search over the givenName
        familyNameResults.forEach(function(aResult) {
          if (Array.isArray(aResult.givenName) && aResult.givenName[0]) {
            givenNames.push({
              contact: aResult,
              givenName: aResult.givenName[0]
            });
          }
        });

        var matchingNames = utils.binarySearch(aContact.givenName[0],
                                               givenNames,
                                               { arrayField: 'givenName'
                            });

        if (matchingNames.length === 0) {
          typeof callbacks.onmistmatch === 'function' && callbacks.onmismatch();
        }
        else {
          var matchingsFound = {};

          matchingNames.forEach(function(aMatchingName) {
            matchingsFound[aMatchingName.contact.id] = {
              matchingContact: aMatchingName.contact
            };
          });
          typeof callbacks.onmatch === 'function' &&
                                            callbacks.onmatch(matchingsFound);
        }

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
        window.console.log('Tel Matches on match !!!!',
                           JSON.stringify(telMatches));
        var matchCbs = {
          onmatch: function(mailMatches) {
            window.console.log('Mail Matches on match !!!!',
                               JSON.stringify(mailMatches));
            // Have a unique set of matches
            var allMatches = telMatches;
            Object.keys(mailMatches).forEach(function(aMatch) {
              if (!allMatches[aMatch]) {
                allMatches[aMatch] = mailMatches[aMatch];
              }
            });
            typeof callbacks.onmatch === 'function' &&
              callbacks.onmatch(allMatches);
          },
          onmismatch: function() {
            typeof callbacks.onmatch === 'function' &&
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
    function phoneFindReady(matches) {
      phoneMatchesReady = true;
      phoneMatches = matches || {};
      if (mailMatchesReady) {
        reconcileResults(nameMatches, phoneMatches, mailMatches, callbacks);
      }
    }

    function mailFindReady(matches) {
      mailMatchesReady = true;
      mailMatches = matches || {};
      if (phoneMatchesReady) {
        reconcileResults(nameMatches, phoneMatches, mailMatches, callbacks);
      }
    }

    var localCbs = {
      onmatch: function(nameMatches) {
        // Now matching by phone number and by email are launched in parallel
        // Then results are reconciled
        var phoneMatches;
        var mailMatches;
        var mailMatchesReady = false;
        var phoneMatchesReady = false;

        var phoneCbs = {
          onmatch: phoneFindReady,
          onmismatch: phoneFindReady
        };

        matchByPhones(aContact, phoneCbs);

        var mailCbs = {
          onmatch: mailFindReady,
          onmismatch: mailFindReady
        };

        matchByEmails(aContact, mailCbs);
      },
      onmismatch: function() {
        typeof callbacks.onmismatch === 'function' && callbacks.onmismatch();
      }
    };
    // If there is no matching by name a mismatch is reported
    matchByName(aContact, localCbs);
  }

  function reconcileResults(nameMatches, phoneMatches, mailMatches, callbacks) {
    var finalMatchings = {};

    // Name matches drive all the process
    Object.keys(nameMatches).forEach(function(aNameMatching) {
      var matchingContact = nameMatches[aNameMatching].matchingContact;

      // Three cases under which a matching is considered
      if (phoneMatches[aNameMatching] && mailMatches[aNameMatching]) {
        finalMatchings[aNameMatching] = nameMatches[aNameMatching];
      }
      else if (phoneMatches[aNameMatching] &&
               (!Array.isArray(matchingContact.email) ||
                !matchingContact.email[0].value)) {
        finalMatchings[aNameMatching] = nameMatches[aNameMatching];
      }
      else if (mailMatches[aNameMatching] &&
              (!Array.isArray(matchingContact.tel) ||
               !matchingContact.tel[0].value)) {
        finalMatchings[aNameMatching] = nameMatches[aNameMatching];
      }
    });

    if (Object.keys(finalMatchings).length > 0) {
      typeof callbacks.onmatch === 'function' &&
                                            callbacks.onmatch(finalMatchings);
    }
    else {
      typeof callbacks.onmismatch === 'function' && callbacks.onmismatch();
    }
  }

  return {
    matchActiveMode: doMatch,
    matchSilentMode: doMatchSilent
  };
})();
