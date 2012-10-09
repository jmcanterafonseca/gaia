'use strict';

var fb = window.fb || {};
fb.CATEGORY = 'facebook';
fb.NOT_LINKED = 'not_linked';
fb.LINKED = 'fb_linked';

// Types of URLs for FB Information
fb.PROFILE_PHOTO_URI = 'fb_profile_photo';
fb.FRIEND_URI = 'fb_friend';

fb.CONTACTS_APP_ORIGIN = 'app://communications.gaiamobile.org';

// Encapsulates all the logic to obtain the data for a FB contact
fb.Contact = function(deviceContact, cid) {
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

  function setFacebookUid(value) {
    doSetFacebookUid(deviceContact, value);
  }

  function doSetFacebookUid(dcontact, value) {
    if (!dcontact.category) {
      dcontact.category = [];
    }

    if (dcontact.category.indexOf(fb.CATEGORY) === -1) {
      markAsFb(dcontact);
    }

    var idx = dcontact.category.indexOf(fb.CATEGORY);

    dcontact.category[idx + 2] = value;
  }

  function markAsFb(dcontact) {
    if (!dcontact.category) {
      dcontact.category = [];
    }

    if (dcontact.category.indexOf(fb.CATEGORY) === -1) {
      dcontact.category.push(fb.CATEGORY);
      dcontact.category.push(fb.NOT_LINKED);
    }

    return dcontact;
  }

  // Mark a mozContact (deviceContact) as linked to a FB contact (uid)
  function markAsLinked(dcontact, uid) {
    if (!dcontact.category) {
      dcontact.category = [];
    }

    if (dcontact.category.indexOf(fb.LINKED) === -1) {
      dcontact.category.push(fb.CATEGORY);
      dcontact.category.push(fb.LINKED);
      dcontact.category.push(uid);
    }

    return dcontact;
  }

  function promoteToLinked(dcontact) {
    var idx = dcontact.category.indexOf(fb.NOT_LINKED);

    if (idx != -1) {
      dcontact.category[idx] = fb.LINKED;
    }
  }

  // The contact is now totally unlinked
  // [...,facebook, fb_not_linked, 123456,....]
  function markAsUnlinked(dcontact) {
    var category = dcontact.category;
    var updatedCategory = [];

    if (category) {
      var idx = category.indexOf(fb.CATEGORY);
      if (idx !== -1) {
        for (var c = 0; c < idx; c++) {
          updatedCategory.push(category[c]);
        }
        // The facebook category, the linked mark and the UID are skipped
        for (var c = idx + 3; c < category.length; c++) {
           updatedCategory.push(category[c]);
        }
      }
    }

    dcontact.category = updatedCategory;

    return dcontact;
  }

  // Sets the data for an imported FB Contact
  this.setData = function(data) {
    contactData = data;
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

  // For saving an imported FB contact
  this.save = function() {
    var outReq = new fb.utils.Request();

    if (contactData && navigator.mozContacts) {
      window.setTimeout(function save_do() {
        var contactObj = new mozContact();
        // Info to be saved on mozContacts
        var contactInfo = {};

        // Copying names to the mozContact
        copyNames(contactData, contactInfo);
        // URL (photo, etc) is stored also with the Device contact
        contactInfo.url = contactData.url;

        doSetFacebookUid(contactInfo, contactData.uid);

        contactObj.init(contactInfo);

        var mozContactsReq = navigator.mozContacts.save(contactObj);

        mozContactsReq.onsuccess = function(e) {
          var fbReq = persistToFbCache(contactData);

          fbReq.onsuccess = function() {
            outReq.done(fbReq.result);
          }
          fbReq.onerror = function() {
            window.console.error('FB: Error while saving on indexedDB');
            outReq.failed(fbReq.error);
          }
        } // mozContactsReq.onsuccess

        mozContactsReq.onerror = function(e) {
          window.console.error('FB: Error while saving on mozContacts',
                                                            e.target.error);
          outReq.failed(e.target.error);
        }
      },0);
    }
    else {
      throw 'Data or mozContacts not available';
    }

     return outReq;
  }

  // Persists FB Friend Data to the FB cache
  function persistToFbCache(contactData) {
    var outReq = new fb.utils.Request();

    window.setTimeout(function persist_fb_do() {
      // now saving the FB-originated data to the "private cache area"
      var data = Object.create(contactData.fbInfo);

      data.tel = contactData.tel || [];
      data.email = contactData.email || [];
      data.uid = contactData.uid;

      Object.keys(contactData.fbInfo).forEach(function(prop) {
        data[prop] = contactData.fbInfo[prop];
      });

      // Names are also stored on indexedDB
      // thus restoring the contact (if unlinked) will be trivial
      copyNames(contactData, data);

      var fbReq = fb.contacts.save(data);

      fbReq.onsuccess = function() {
        outReq.done(fbReq.result);
      }
      fbReq.onerror = function() {
        window.console.error('FB: Error while saving on indexedDB');
        outReq.failed(fbReq.error);
      }
    },0);

    return outReq;
  }

  // Updates a FB Contact
  this.update = function(contactData) {

    // Auxiliary function to persist to the FB cache
    function auxCachePersist(outReq) {
      var fbReq = persistToFbCache(contactData);

      fbReq.onsuccess = function() {
        outReq.done(fbReq.result);
      }
      fbReq.onerror = function() {
        window.console.error('FB: Error while saving to FB cache',
                             contactData.uid, fbReq.error);
        outReq.failed(fbReq.error);
      }
    }

    // Code starts here
    var outReq = new fb.utils.Request();

    window.setTimeout(function update_do() {
      // First an update to the mozContacts DB could be needed
      var updateMozContacts = false;

      if(!fb.isFbLinked(dcontact)) {
        copyNames(contactData,dcontact);
        updateMozContacts = true;
      }

      // Check whether the photo has changed
      if(contactData.photo) {
        dcontact.url = contactData.url;
        updateMozContacts = true;
      }

      if(updateMozContacts) {
        var mozContactsReq = navigator.mozContacts.save(dcontacts);
        mozContactsReq.onsuccess = function(e) {
          auxCachePersist(outReq);
        }

        mozContactsReq.onerror = function(e) {
          window.console.error('FB: Error while saving mozContact: ',dcontact.id,
                               e.target.error);
          outReq.failed(e.target.error);
        }
      }
      else {
        auxCachePersist(outReq);
      }

    },0);

    return outReq;
  }

  function copyNames(source, destination) {
    destination.name = source.name;
    destination.givenName = source.givenName;
    destination.familyName = source.familyName;
    destination.additionalName = source.additionalName;
  }

  // Merges mozContact data with Facebook data
  this.merge = function(fbdata) {
    var out = devContact;

    if (fbdata) {
      out = Object.create(devContact);

      Object.keys(devContact).forEach(function(prop) {
        if (devContact[prop] &&
                              typeof devContact[prop].forEach === 'function') {
          out[prop] = [];
          out[prop] = out[prop].concat(devContact[prop]);
        }
        else if (devContact[prop]) {
          out[prop] = devContact[prop];
        }
      });

      mergeFbData(out, fbdata);
    }

    return out;
  }

  function mergeFbData(dcontact, fbdata) {
    var multipleFields = ['email', 'tel', 'photo', 'org'];

    multipleFields.forEach(function(field) {
      if (!dcontact[field]) {
        dcontact[field] = [];
      }
      var items = fbdata[field];
      if (items) {
        items.forEach(function(item) {
          dcontact[field].push(item);
        });
      }
    });

    var singleFields = ['bday'];
    singleFields.forEach(function(field) {
      dcontact[field] = fbdata[field];
    });

  }

  // Gets the data
  this.getData = function() {

    var outReq = new fb.utils.Request();

    window.setTimeout(function do_getData() {
      var uid = doGetFacebookUid(devContact);

      if (uid) {
        var fbreq = fb.contacts.get(uid);

        fbreq.onsuccess = function() {
          var fbdata = fbreq.result;
          var out = this.merge(fbdata);
          outReq.done(out);

        }.bind(this);

        fbreq.onerror = function() {
          outReq.failed(fbreq.error);
        }
      }
      else {
        outReq.done(devContact);
      }
    }.bind(this), 0);

    return outReq;
  }


  this.getDataAndValues = function() {
    var outReq = new fb.utils.Request();

    window.setTimeout(function do_getData() {
      var uid = doGetFacebookUid(devContact);

      if (uid) {
        var fbreq = fb.contacts.get(uid);

        fbreq.onsuccess = function() {
          var fbdata = fbreq.result;

          var out1 = this.merge(fbdata);

          var out2 = {};

          Object.keys(fbdata).forEach(function(key) {
            var dataElement = fbdata[key];

            if (dataElement && typeof dataElement.forEach === 'function' &&
                key !== 'photo') {
              dataElement.forEach(function(item) {
                if (item.value && item.value.length > 0) {
                  out2[item.value] = 'p';
                }
                else if (typeof item === 'string' && item.length > 0) {
                  out2[item] = 'p';
                }
              });
            }
            else if (key === 'photo') {
              out2['hasPhoto'] = true;
            }
            else if (dataElement) {
              out2[dataElement] = 'p';
            }
          });

          outReq.done([out1, out2]);

        }.bind(this);

        fbreq.onerror = function() {
          outReq.failed(fbreq.error);
        }
      }
      else {
        outReq.done([devContact, {}]);
      }
    }.bind(this), 0);

    return outReq;
  }

  this.promoteToLinked = function() {
    promoteToLinked(devContact);
  }

  this.linkTo = function(fbFriend) {
    var out = new fb.utils.Request();

    window.setTimeout(function do_linkTo() {
      if (!devContact) {
        // We need to get the Contact data
        var req = fb.utils.getContactData(contactid);

        req.onsuccess = function() {
          devContact = req.result;
          doLink(devContact, fbFriend, out);
        } // req.onsuccess

        req.onerror = function() {
          throw 'FB: Error while retrieving contact data';
        }
      } // devContact
      else {
        doLink(devContact, fbFriend, out);
      }
    },0);

    return out;
  }

  function doLink(contactdata, fbFriend, out) {
    if (contactdata) {
      if (fbFriend.uid) {
        // When marking as linked is needed to store a reference to the profile
        // picture URL
        markAsLinked(contactdata, fbFriend.uid);
      }
      else if (fbFriend.mozContact) {
        markAsLinked(contactdata, doGetFacebookUid(fbFriend.mozContact));
      }

      var mozContactsReq = navigator.mozContacts.save(contactdata);

      mozContactsReq.onsuccess = function(e) {
        // The FB contact on mozContacts needs to be removed
        if (fbFriend.mozContact) {
          var deleteReq = navigator.mozContacts.remove(fbFriend.mozContact);

          deleteReq.onsuccess = function(e) {
            out.done(e.target.result);
          }

          deleteReq.onerror = function(e) {
            window.console.error('FB: Error while linking');
            out.failed(e.target.error);
          }
        }
        else {
          out.done(e.target.result);
        }
      } // mozContactsReq.onsuccess

      mozContactsReq.onerror = function(e) {
        out.failed(e.target.error);
      } // mozContactsReq.onerror
    } // if(dev.contact)
    else {
      throw 'FB: Contact data not defined';
    }
  }

  // if type === 'hard' the FB Friend is removed from the cache
  this.unlink = function(type) {
    var out = new fb.utils.Request();

    window.setTimeout(function do_unlink() {
      if (!devContact) {
        // We need to get the Contact data
        var req = fb.utils.getContactData(contactid);

        req.onsuccess = function() {
          devContact = req.result;
          doUnlink(devContact, out, type);
        } // req.onsuccess

        req.onerror = function() {
          throw 'FB: Error while retrieving contact data';
        }
      } // devContact
      else {
        doUnlink(devContact, out, type);
      }
    }, 0);

    return out;
  }

  function doUnlink(dContact, out, type) {
    var theType = type || 'soft';
    var uid = doGetFacebookUid(dContact);

    markAsUnlinked(dContact);
    var req = navigator.mozContacts.save(dContact);

    req.onsuccess = function(e) {
      if (theType !== 'hard') {

        // Then the original FB imported contact is restored
        var fbDataReq = fb.contacts.get(uid);

        fbDataReq.onsuccess = function() {
          var imported = fbDataReq.result;

          var data = {};
          copyNames(imported, data);
          doSetFacebookUid(data, uid);

          var mcontact = new mozContact();
          mcontact.init(data);

          // The FB contact is restored
          var reqRestore = navigator.mozContacts.save(mcontact);

          reqRestore.onsuccess = function(e) {
            out.done(mcontact.id);
          }

          reqRestore.onerror = function(e) {
            out.failed(e.target.error);
          }
        }

        fbDataReq.onerror = function() {
          window.console.error('FB: Error while unlinking contact data');
          out.failed(fbDataReq.error);
        }
      }
      else {
        // FB Data is removed from the cache
        var removeReq = fb.contacts.remove(uid);

        removeReq.onsuccess = function() {
          out.done(removeReq.result);
        }

        removeReq.onerror = function() {
          out.failed(removeReq.error);
        }
      }
    }

    req.onerror = function(e) {
      out.failed(e.target.error);
    }
  }

  this.remove = function() {
    var out = new fb.utils.Request();

    window.setTimeout(function do_remove() {
      var uid = doGetFacebookUid(devContact);

      var removeReq = navigator.mozContacts.remove(devContact);
      removeReq.onsuccess = function(e) {
        var fbReq = fb.contacts.remove(uid);
        fbReq.onsuccess = function() {
          out.done(fbReq.result);
        }

        fbReq.onerror = function() {
          out.failed(fbReq.error);
        }
      }

      removeReq.onerror = function(e) {
        out.failed(e.target.error);
      }
    }, 0);

    return out;
  }

}; // fb.Contact

// Some convenience functions follow

fb.isFbContact = function(devContact) {
  return (devContact.category &&
                        devContact.category.indexOf(fb.CATEGORY) !== -1);
};


fb.isFbLinked = function(devContact) {
  return (devContact.category &&
                        devContact.category.indexOf(fb.LINKED) !== -1);
};


fb.getFriendUid = function(devContact) {
  var out = devContact.uid;

  if (!out) {
    if (fb.isFbLinked(devContact)) {
      out = fb.getLinkedTo(devContact);
    }
    else if (devContact.category) {
      var idx = devContact.category.indexOf(fb.CATEGORY);
      if (idx !== -1) {
        out = devContact.category[idx + 2];
      }
    }
  }

  return out;
}


fb.getLinkedTo = function(devContact) {
  var out;

  if (devContact.category) {
    var idx = devContact.category.indexOf(fb.LINKED);
    if (idx !== -1) {
      out = devContact.category[idx + 1];
    }
  }

  return out;
}


fb.getFriendPictureUrl = function(devContact) {
  var out;

  var urls = devContact.url;

  if(urls) {
    for(var c = 0; c < urls.length; c++) {
      if(aurl.type.indexOf(fb.PROFILE_PHOTO_URI) !== -1) {
        out = aurl.value;
        break;
      }
    }
  }

  return out;
}

// Adapts data to the mozContact format names
fb.friend2mozContact = function(f) {
// givenName is put as name but it should be f.first_name
  f.familyName = [f.last_name];
  f.additionalName = [f.middle_name];
  f.givenName = [f.first_name + ' ' + f.middle_name];

  delete f.last_name;
  delete f.middle_name;
  delete f.first_name;

  var privateType = 'personal';

  if (f.email) {
    f.email1 = f.email;
    f.email = [{
                  type: [privateType],
                  value: f.email
    }];
  }
  else {
    f.email1 = '';
  }

  var nextidx = 0;
  if (f.cell) {

    f.tel = [{
      type: [privateType],
      value: f.cell
    }];

    nextidx = 1;
  }

  if (f.other_phone) {
    if (!f.tel) {
      f.tel = [];
    }

    f.tel[nextidx] = {
      type: [privateType],
      value: f.other_phone
    };

  }

  delete f.other_phone;
  delete f.cell;

  f.uid = f.uid.toString();
}


/**
  * Auxiliary function to know where a contact works
  *
*/
fb.getWorksAt = function(fbdata) {
  var out = '';
  if (fbdata.work && fbdata.work.length > 0) {
    // It is assumed that first is the latest
    out = fbdata.work[0].employer.name;
  }

  return out;
}

 /**
  *  Facebook dates are MM/DD/YYYY
  *
  *  Returns the birth date
  *
  */
fb.getBirthDate = function getBirthDate(sbday) {
  var out = new Date();

  var imonth = sbday.indexOf('/');
  var smonth = sbday.substring(0, imonth);

  var iyear = sbday.lastIndexOf('/');
  if (iyear === imonth) {
    iyear = sbday.length;
  }
  var sday = sbday.substring(imonth + 1, iyear);

  var syear = sbday.substring(iyear + 1, sbday.length);

  out.setDate(parseInt(sday));
  out.setMonth(parseInt(smonth) - 1, parseInt(sday));

  if (syear && syear.length > 0) {
    out.setYear(parseInt(syear));
  }

  return out;
}
