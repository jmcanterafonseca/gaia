'use strict';

var fb = window.fb || {};

// Encapsulates all the logic to obtain the data for a FB contact
fb.ContactReader = function(deviceContact, cid) {
  var contactData;
  var devContact = deviceContact;
  var contactid = cid;

  function doGetFacebookUid(data) {
    return fb.getFriendUid(data);
  }

  function getLinkedTo(c) {
    return fb.getLinkedTo(c);
  }

  function getFacebookUid() {
    return doGetFacebookUid(deviceContact);
  }

  Object.defineProperty(this, 'uid', {
    get: getFacebookUid,
    set: setFacebookUid,
    enumerable: true,
    configurable: false
  });

  Object.defineProperty(this, 'mozContact', {
    get: getDevContact
  });

  function getDevContact() {
    return devContact;
  }

  function asArrayOfValues(value) {
    return Array.isArray(value) ? value : [value];
  }

  function copyNames(source, destination) {
    destination.name = asArrayOfValues(source.name);
    destination.givenName = asArrayOfValues(source.givenName);
    destination.familyName = asArrayOfValues(source.familyName);
    destination.additionalName = asArrayOfValues(source.additionalName);
  }

  /*
   * Shallow copy from source to target object
   */
  function populate(source, target, propertyNames) {
    propertyNames.forEach(function(property) {
      var propertyValue = source[property];
      if (propertyValue) {
        if (Array.isArray(propertyValue)) {
          target[property] = propertyValue.slice(0, propertyValue.length);
        } else {
          target[property] = propertyValue;
        }
      }
    });
  }

  // Merges mozContact data with Facebook data
  this.merge = function(fbdata) {
    var out = devContact;

    if (fbdata) {
      out = Object.create(null);
      out.updated = devContact.updated;
      out.published = devContact.published;

      // The id comes from devContact and the rest of properties like
      // familyName, propertyName, etc... are defined in the prototype object
      populate(devContact, out, Object.getOwnPropertyNames(devContact));
      populate(devContact, out,
                 Object.getOwnPropertyNames(Object.getPrototypeOf(devContact)));

      mergeFbData(out, fbdata);
    }

    return out;
  };


  // Checks whether there is a duplicate for the field value
  // both in FB and in the local device Contact data
  // Returns an array with the values which are duplicated or empty if
  // no duplicates were found
  // Parameters are: field on which to search, the corresponding fbItem
  // the local device items, and extra FB Items which correspond to the short
  // telephone numbers allowing to filter out duplicates with intl-ed numbers
  function checkDuplicates(field, fbItem, devContactItems, extraFbItems) {
    var potentialDuplicatesFields = ['email', 'tel'];
    var out = [];

    if (devContactItems && potentialDuplicatesFields.indexOf(field) !== -1) {
      var total = devContactItems.length;
      for (var i = 0; i < total; i++) {
        var localValue = devContactItems[i].value;
        var fbValue = fbItem.value;
        // Checking for telephone international number matching
        if (localValue) {
          var trimedLocal = localValue.trim();
          if (trimedLocal === fbValue ||
             (field === 'tel' && Array.isArray(extraFbItems) &&
              extraFbItems.indexOf(trimedLocal) !== -1)) {
            out.push(trimedLocal);
            out.push(fbValue);
          }
        } // if(localValue)
      } // for
    } // if(devContactItems)

    return out;
  }


  function mergeFbData(dcontact, fbdata) {
    var multipleFields = ['email', 'tel', 'photo', 'org', 'adr'];

    multipleFields.forEach(function(field) {
      if (!dcontact[field]) {
        dcontact[field] = [];
      }
      var items = fbdata[field];
      if (items) {
        items.forEach(function(item) {
          // If there are no duplicates the merge is done
          var dupList = checkDuplicates(field, item, dcontact[field],
                                        fbdata.shortTelephone);
          if (dupList.length === 0) {
            dcontact[field].push(item);
          }
        });
      }
    });

    var singleFields = ['bday'];
    singleFields.forEach(function(field) {
      dcontact[field] = fbdata[field];
    });

    // To support the case in which the contact does not have a local name
    fb.mergeNames(dcontact, fbdata);
  }

  // Gets the data
  this.getData = function() {

    var outReq = new fb.utils.Request();

    window.setTimeout(function do_getData() {
      var uid = doGetFacebookUid(devContact);

      if (uid) {
        var fbreq = fb.contacts.get(uid);

        fbreq.onsuccess = (function() {
          var fbdata = fbreq.result;
          var out = this.merge(fbdata);
          outReq.done(out);

        }).bind(this);

        fbreq.onerror = function() {
          outReq.failed(fbreq.error);
        };
      }
      else {
        outReq.done(devContact);
      }
    }.bind(this), 0);

    return outReq;
  };




  function propagateField(field, from, to) {
    var copied = false;

    // The field is copied when it is undefined in the target object
    if (!Array.isArray(to[field]) || !to[field][0] || !to[field][0].trim()) {
      to[field] = from[field];
      copied = true;
    }

    return copied;
  }

  function createName(contact) {
    contact.name = [];

    if (Array.isArray(contact.givenName)) {
      contact.name[0] = contact.givenName[0] + ' ';
    }

    if (Array.isArray(contact.familyName))
      contact.name[0] += contact.familyName[0];
  }

  function propagateNames(from, to) {
    var isGivenNamePropagated = propagateField('givenName', from, to);
    var isFamilyNamePropagated = propagateField('familyName', from, to);

    if (isGivenNamePropagated || isFamilyNamePropagated) {
      //  We are going to mark the propagation in the category field
      if (isGivenNamePropagated)
        fb.setPropagatedFlag('givenName', to);

      if (isFamilyNamePropagated)
        fb.setPropagatedFlag('familyName', to);

      createName(to);
    }
  }

  // This method copies names to a contact when they are propagated from fb
  function revisitPropagatedNames(from, to) {
    if (fb.isPropagated('givenName', to))
      to['givenName'] = from['givenName'];

    if (fb.isPropagated('familyName', to))
      to['familyName'] = from['familyName'];

    createName(to);
  }



  // Reset givenName and familyName if it is needed after unlinking
  function resetNames(dContact) {
    if (fb.isPropagated('givenName', dContact)) {
      dContact.givenName = [''];
      fb.removePropagatedFlag('givenName', dContact);
    }

    if (fb.isPropagated('familyName', dContact)) {
      dContact.familyName = [''];
      fb.removePropagatedFlag('familyName', dContact);
    }

    dContact.name = [dContact.givenName[0] + ' ' + dContact.familyName[0]];
  }
}; // fb.ContactReader
