var contacts = window.contacts || {};

contacts.Merger = (function() {
  // Target contact is a new Contact to be added to the device
  // deviceContacts are contacts already present on the device
  var newContact, matchingResults;

  function doMerge(pnewContact, pmatchingResults) {
    newContact = pnewContact;
    matchingResults = pmatchingResults;

    return mergeAll();
  }

  function mergeAll() {
    var maxLenghtGivenName = 0;
    var maxLenghtFamilyName = 0;
    var recGivenName = [];
    var recFamilyName = [];
    var recOrgs = [];
    var recEmails = [];
    var recTels = [];
    var recBDay;

    var newContactData = {};
    var orgsHash = {};
    var emailsHash = {};
    var telsHash = {};

    matchingResults.forEach(function(aResult) {
      var aDeviceContact = aResult.matchingContact;

      var givenName = aDeviceContact.givenName;
      if (Array.isArray(givenName) && givenName[0] && givenName[0].length >
         maxLenghtGivenName) {
        maxLenghtGivenName = givenName[0].length;
        recGivenName.pop();
        recGivenName.push(givenName[0]);
      }

      var familyName = aDeviceContact.familyName;
      if (Array.isArray(familyName) && familyName[0] && familyName[0].length >
         maxLenghtFamilyName) {
        maxLenghtFamilyName = familyName[0].length;
        recFamilyName.pop();
        recFamilyName.push(familyName[0]);
      }

      if (!recBDay && aDeviceContact.bday) {
        recBDay = aDeviceContact.bday;
      }

      if (Array.isArray(aDeviceContact.org)) {
        aDeviceContact.org.forEach(function(aOrg) {
          if (!orgsHash[aOrg]) {
            recOrgs.push(aOrg);
            orgsHash[aOrg] = true;
          }
        });
      }

      if (Array.isArray(aDeviceContact.email)) {
        aDeviceContact.email.forEach(function(aEmail) {
          if (!emailsHash[aEmail.value]) {
            recEmails.push(aEmail);
            emailsHash[aEmail.value] = true;
          }
        });
      }

      if (Array.isArray(aDeviceContact.tel)) {
        aDeviceContact.tel.forEach(function(aTel) {
          if (!telsHash[aTel.value] && (aTel.value === aResult.target ||
                                      aTel.value === aResult.matchedValue)) {
            var theValue = aResult.target.length > aResult.matchedValue.length ?
                              aResult.target : aResult.matchedValue;
            recTels.push({
              type: aTel.type,
              value: theValue,
              carrier: aTel.carrier
            });
            telsHash[aResult.target] = true;
            telsHash[aResult.matchedValue] = true;
          }
          else if (!telsHash[aTel.value]) {
            recTels.push(aTel);
            telsHash[aTel.value] = true;
          }
        });
      }
    });

    if (recGivenName.length === 0) {
      recGivenName = newContact.givenName;
    }

    if (recFamilyName.length === 0) {
      recFamilyName = newContact.familyName;
    }

    if (Array.isArray(newContact.org)) {
      newContact.org.forEach(function(aOrg) {
        if (!orgsHash[aOrg]) {
          recOrgs.push(aOrg);
          orgsHash[aOrg] = true;
        }
      });
    }

    if (!recBDay && newContact.bday) {
      recBDay = newContact.bday;
    }

    if (Array.isArray(newContact.email)) {
      newContact.email.forEach(function(aEmail) {
        if (!emailsHash[aEmail.value]) {
          recEmails.push(aEmail);
          emailsHash[aEmail.value] = true;
        }
      });
    }

    if (Array.isArray(newContact.tel)) {
      newContact.tel.forEach(function(aTel) {
        if (!telsHash[aTel.value]) {
          if (!Array.isArray(aTel.type)) {
            aTel.type = [aTel.type];
          }
          recTels.push(aTel);
          telsHash[aTel.value] = true;
        }
      });
    }

    newContactData.familyName = recFamilyName;
    newContactData.givenName = recGivenName;

    var name = (Array.isArray(recGivenName) ? recGivenName[0] : '') +
                          ' ' +
                (Array.isArray(recFamilyName) ? recFamilyName[0] : '');
    newContactData.name = [name];

    newContactData.org = recOrgs;
    newContactData.email = recEmails;

    window.console.log('Tels hash: ', JSON.stringify(telsHash),
                       JSON.stringify(recTels));

    newContactData.tel = recTels;
    newContactData.bday = recBDay;

    return newContactData;
  }

  return {
    merge: doMerge
  };

})();
