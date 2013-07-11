var contacts = window.contacts || {};

contacts.Merger = (function() {
  // Target contact is a new Contact to be added to the device
  // deviceContacts are contacts already present on the device
  var newContact, matchingResults;
  var recAddrs = [];
  var recEmails = [];
  var recOrgs = [];
  var recCategories = [];
  var addrsTypeHash = {};
  var emailsHash = {};
  var orgsHash = {};
  var categoriesHash = {};

  function doMerge(pnewContact, pmatchingResults) {
    newContact = pnewContact;

    window.console.log('New Contact Data: ', JSON.stringify(newContact));
    window.console.log('Matching Results: ', JSON.stringify(pmatchingResults));

    matchingResults = pmatchingResults;

    return mergeAll();
  }

  function mergeAll() {
    var maxLengthGivenName = 0;
    var maxLengthFamilyName = 0;
    var recGivenName = [];
    var recFamilyName = [];

    var recTels = [];
    var recPhotos = [];
    var recBDay;

    var telsHash = {};

    recAddrs = [];
    addrsTypeHash = {};

    recEmails = [];
    emailsHash = {};

    recOrgs = [];
    orgsHash = {};

    recCategories = [];
    categoriesHash = {};

    Object.keys(matchingResults).forEach(function(aResult) {
      var aDeviceContact = matchingResults[aResult].matchingContact;

      var givenName = aDeviceContact.givenName;
      if (Array.isArray(givenName) && givenName[0] && givenName[0].length >
         maxLengthGivenName) {
        maxLengthGivenName = givenName[0].length;
        recGivenName.pop();
        recGivenName.push(givenName[0]);
      }

      var familyName = aDeviceContact.familyName;
      if (Array.isArray(familyName) && familyName[0] && familyName[0].length >
         maxLengthFamilyName) {
        maxLengthFamilyName = familyName[0].length;
        recFamilyName.pop();
        recFamilyName.push(familyName[0]);
      }

      if (!recBDay && aDeviceContact.bday) {
        recBDay = aDeviceContact.bday;
      }

      populateOrgs(aDeviceContact.org);
      populateCategories(aDeviceContact.category);

      populateEmails(aDeviceContact.email);

      if (Array.isArray(aDeviceContact.tel)) {
        aDeviceContact.tel.forEach(function(aTel) {
          var currentResult = matchingResults[aResult];

          var matchedValIdx = currentResult.matchedValues.indexOf(aTel.value);
          var matchedValue = '';
          if (matchedValIdx !== -1) {
            matchedValue = currentResult.matchedValues[matchedValIdx];
          }
          if (!telsHash[aTel.value] && (aTel.value === currentResult.target ||
                                     matchedValue === aTel.value)) {
            var theValue = currentResult.target.length > matchedValue.length ?
                              currentResult.target : matchedValue;
            recTels.push({
              type: aTel.type,
              value: theValue,
              carrier: aTel.carrier,
              pref: aTel.pref
            });
            telsHash[currentResult.target] = true;
            telsHash[matchedValue] = true;
          }
          else if (!telsHash[aTel.value]) {
            recTels.push(aTel);
            telsHash[aTel.value] = true;
          }
        });
      }

      if (Array.isArray(aDeviceContact.photo)) {
        recPhotos.push(aDeviceContact.photo[0]);
      }

      populateAddrs(aDeviceContact.adr);
    }); // matchingResults

    if (recGivenName.length === 0) {
      recGivenName = newContact.givenName;
    }

    if (recFamilyName.length === 0) {
      recFamilyName = newContact.familyName;
    }

    populateOrgs(newContact.org);
    populateCategories(newContact.category);

    if (!recBDay && newContact.bday) {
      recBDay = newContact.bday;
    }

    if (Array.isArray(newContact.photo) && recPhotos.length === 0) {
      recPhotos.push(newContact.photo[0]);
    }

    populateEmails(newContact.email);

    if (Array.isArray(newContact.tel)) {
      newContact.tel.forEach(function(aTel) {
        if (!telsHash[aTel.value]) {
          aTel.type = (Array.isArray(aTel.type) ? aTel.type : [aTel.type]);
          recTels.push(aTel);
          telsHash[aTel.value] = true;
        }
      });
    }

    populateAddrs(newContact.adr);

    var name = (Array.isArray(recGivenName) ? recGivenName[0] : '') +
                          ' ' +
                (Array.isArray(recFamilyName) ? recFamilyName[0] : '');

     // Now we populate
    return {
      familyName: recFamilyName,
      givenName: recGivenName,
      name: name,
      org: recOrgs,
      email: recEmails,
      tel: recTels,
      bday: recBDay,
      adr: recAddrs,
      category: recCategories
    };
  }

  function populateAddrs(sourceAddrs) {
    // Addreses are added provided they have a different type
    if (Array.isArray(sourceAddrs)) {
      sourceAddrs.forEach(function(aAddr) {
        var type = Array.isArray(aAddr.type) ? aAddr.type : [aAddr.type];
        aAddr.type = type;
        if (type[0] && !addrsTypeHash[type[0]]) {
          recAddrs.push(aAddr);
          addrsTypeHash[type[0]] = true;
        }
      });
    }
  }

  function populateEmails(sourceEmails) {
    if (Array.isArray(sourceEmails)) {
      sourceEmails.forEach(function(aEmail) {
        var type = Array.isArray(aEmail.type) ? aEmail.type : [aEmail.type];
        aEmail.type = type;
        if (!emailsHash[aEmail.value]) {
          recEmails.push(aEmail);
          emailsHash[aEmail.value] = true;
        }
      });
    }
  }

  function populateOrgs(sourceOrgs) {
    if (Array.isArray(sourceOrgs)) {
      sourceOrgs.forEach(function(aOrg) {
        if (!orgsHash[aOrg]) {
          recOrgs.push(aOrg);
          orgsHash[aOrg] = true;
        }
      });
    }
  }

  function populateCategories(sourceCats) {
    if (Array.isArray(sourceCats)) {
      sourceCats.forEach(function(aCat) {
        if (!categoriesHash[aCat]) {
          recCategories.push(aCat);
        }
      });
    }
  }

  return {
    merge: doMerge
  };

})();
