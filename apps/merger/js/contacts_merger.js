var contacts = window.contacts || {};

contacts.Merger = (function() {
  var newContactData = {};
  var orgsHash = {};
  var emailsHash = {};
  var telsHash = {};

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
          if (!telsHash[aTel.value] && aTel.value === aResult.target ||
                                      aTel.value === aResult.matchedValue) {
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

    if (Array.isArray(newContact.email)) {
      newContact.email.forEach(function(aEmail) {
        if (!emailsHash[aEmail.value]) {
          recEmails.push(aEmail);
          emailsHash[aEmail.value] = true;
        }
      });
    }

    newContactData.familyName = recFamilyName;
    newContactData.givenName = recGivenName;
    newContactData.org = recOrgs;
    newContactData.email = recEmails;

    if (recTels.length === 0) {
      recTels = newContact.tel;
    }

    newContactData.tel = recTels;

    return newContactData;
  }

  return {
    merge: doMerge
  };

})();
