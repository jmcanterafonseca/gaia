var contacts = window.contacts || {};

contacts.Matcher = (function() {
  var selfContactId;
  var incomingContact;

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

        var filterBy = options.filterBy;

        matchings.forEach(function(aMatching) {
          var values = aMatching[options.filterBy[0]];
          var matchedValue;

          values.forEach(function(aValue) {
            var type = aValue.type;
            var value = aValue.value;

            if (value === target || value.indexOf(target) !== -1 ||
               target.indexOf(value) !== -1) {
              matchedValue = value;
            }

            if (selfContactId !== aMatching.id) {
              finalMatchings[aMatching.id] = {
                target: target,
                fields: filterBy,
                matchedValues: [matchedValue],
                matchingContact: aMatching
              };
            }
          });
        });

        var numFinalMatchings = Object.keys(finalMatchings).length;

        if (numFinalMatchings > 0) {
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
    var values = [];

    if (Array.isArray(aContact.tel)) {
      aContact.tel.forEach(function(aTel) {
        values.push(aTel.value);
      });
    }

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

    if (Array.isArray(aContact.email)) {
      aContact.email.forEach(function(aEmail) {
        values.push(aEmail.value);
      });
    }

    if (values.length > 0) {
      var matcher = new MatcherObj(values, {
        filterBy: ['email'],
        filterOp: 'equals'
      });
      matcher.onmatch = callbacks.onmatch;

      matcher.onmismatch = callbacks.onmismatch;

      matcher.start();
    }
    else {
      typeof callbacks.onmismatch === 'function' && callbacks.onmismatch();
    }
  }


  function doMatch(aContact, callbacks) {
    incomingContact = aContact;
    selfContactId = aContact.id;

    var localCbs = {
      onmatch: function(telMatches) {
        var matchCbs = {
          onmatch: function(mailMatches) {
            // Have a unique set of matches
            var allMatches = telMatches;
            Object.keys(mailMatches).forEach(function(aMatch) {
              if (!allMatches[aMatch]) {
                allMatches[aMatch] = mailMatches[aMatch];
              }
              else {
                allMatches[aMatch].fields.push('email');
                allMatches[aMatch].matchedValues.push(
                                        mailMatches[aMatch].matchedValues[0]);
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
    incomingContact = aContact;
    selfContactId = aContact.id;

    if (!Array.isArray(aContact.familyName) ||
      !Array.isArray(aContact.givenName) || !aContact.familyName[0] ||
      !aContact.givenName[0]) {

      typeof callbacks.onmismatch === 'function' && callbacks.onmismatch();

      return;
    }

    var matchingsFound = {};

    var blankRegExp = /\s+/g;

    var localCbs = {
      onmatch: function(results) {
        // Results will contain contacts that match by tel or email
        // Now a binary search is performed over givenName and lastName
        // Normalizing the strings
        var names = [];
        Object.keys(results).forEach(function(aResultId) {
          var mContact = results[aResultId].matchingContact;

          if (!Array.isArray(mContact.familyName) ||
              !Array.isArray(mContact.givenName) || !mContact.familyName[0] ||
              !mContact.givenName[0]) {

            return;
          }

          // As the number of candidates here will be short a normal search
          // will be conducted

          var targetFN = Normalizer.toAscii(
                          incomingContact.familyName[0].trim().toLowerCase()).
                          replace(blankRegExp, '');
          var targetGN = Normalizer.toAscii(
                          incomingContact.givenName[0].trim().toLowerCase()).
                          replace(blankRegExp, '');

          names.push({
            contact: mContact,
            familyName: Normalizer.toAscii(
                                  mContact.familyName[0].trim().toLowerCase()).
                          replace(blankRegExp, ''),
            givenName: Normalizer.toAscii(
                                    mContact.givenName[0].trim().toLowerCase()).
                          replace(blankRegExp, '')
          });

          var matchingList = names.filter(function(x) {
            return (x.familyName === targetFN && x.givenName === targetGN);
          });

          matchingList.forEach(function(aMatching) {
            var contact = aMatching.contact;
            matchingsFound[contact.id] = {
              matchingContact: contact
            };
          });
        });

        reconcileResults(matchingsFound, results, callbacks);
      },

      onmismatch: function() {
        typeof callbacks.onmismatch === 'function' && callbacks.onmismatch();
      }
    };

    // Matching by email and phone number, then match by names
    doMatch(aContact, localCbs);
  }

  function isEmpty(collection) {
    return (!Array.isArray(collection) || !collection[0] || (collection[0] &&
                                                !collection[0].value));
  }

  function reconcileResults(nameMatches, phoneMailMatches, callbacks) {
    var finalMatchings = {};

    // Name matches drive all the process
    Object.keys(nameMatches).forEach(function(aNameMatching) {
      var matchingContact = nameMatches[aNameMatching].matchingContact;

      var isPhoneMatching = phoneMailMatches[aNameMatching].
                                          fields.indexOf('tel') !== -1;
      var isMailMatching = phoneMailMatches[aNameMatching].
                                          fields.indexOf('email') !== -1;

      // Three cases under which a matching is considered
      if (isPhoneMatching && isMailMatching) {
        finalMatchings[aNameMatching] = phoneMailMatches[aNameMatching];
      }
      else if (isPhoneMatching && (isEmpty(incomingContact.email) ||
              isEmpty(matchingContact.email))) {
        finalMatchings[aNameMatching] = phoneMailMatches[aNameMatching];
      }
      else if (isMailMatching && (isEmpty(incomingContact.tel) ||
                                  isEmpty(matchingContact.tel))) {
        finalMatchings[aNameMatching] = phoneMailMatches[aNameMatching];
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
