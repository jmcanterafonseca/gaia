'use strict';

// Encapsulates all the logic to obtain the data for a FB contact
function FacebookContact(deviceContact) {
  var contactData;

  var devContact = deviceContact;
  var FB_CATEGORY = 'facebook';
  var FB_NOT_LINKED = 'not_linked';

    /**
     *   Request auxiliary object to support asynchronous calls
     *
     */
    var Request = function() {
      this.done = function(result) {
        this.result = result;
        this.onsuccess();
      }

      this.failed = function(error) {
        this.error = error;
        this.onerror();
      }
    }

  function doGetFacebookUid(data) {
    var out = data.uid;
    if(!out) {
      if(data.category) {
        var idx = data.category.indexOf(FB_CATEGORY);
        if(idx !== -1) {
          out = data.category[idx + 2];
        }
      }
    }
    return out;
  }

  function getFacebookUid() {
    return doGetFacebookUid(deviceContact);
  }

  function setFacebookUid(value) {
    doSetFacebookUid(deviceContact,value);
  }

  function doSetFacebookUid(dcontact,value) {
    if(!dcontact.category) {
      dcontact.category = [];
    }

    if(dcontact.category.indexOf(FB_CATEGORY) === -1) {
      markAsFb(dcontact);
    }

    var idx = dcontact.category.indexOf(FB_CATEGORY);

    dcontact.category[idx + 2] = value;
  }

  function markAsFb(dcontact) {
    if(!dcontact.category) {
      dcontact.category = [];
    }

    if(dcontact.category.indexOf(FB_CATEGORY) === -1) {
      dcontact.category.push(FB_CATEGORY);
      dcontact.category.push(FB_NOT_LINKED);
    }
  }

  // Sets the data for the FB Contact
  this.setData = function(data) {
    contactData = data;
  }

  Object.defineProperty(this,'uid', {
    get: getFacebookUid,
    set: setFacebookUid,
    enumerable: true,
    configurable: false
  });


  this.save = function() {
    var outReq = null;

    if(contactData && navigator.mozContacts) {
      var contactObj = new mozContact();
      // Info tbe saved on mozContacts
      var contactInfo = {};

      contactInfo.name = contactData.name;
      contactInfo.givenName = contactData.givenName;
      contactInfo.familyName = contactData.familyName;
      contactInfo.additionalName = contactData.additionalName;
      contactInfo.photo = contactData.photo;

      doSetFacebookUid(contactInfo,contactData.uid);

      contactObj.init(contactInfo);

      outReq = new Request();

      window.console.log('About to saving',contactData.uid);

      window.setTimeout(function save_do () {
        var mozContactsReq = navigator.mozContacts.save(contactObj);

        mozContactsReq.onsuccess = function(e) {
          // now saving the FB-originated data to the "private area"
          window.console.log('About to saving on indexedDB',contactData.uid);

          try {
          var data = contactData.fbInfo;
          data.tel = contactData.tel || [];
          data.email = contactData.email || [];
          data.uid =  contactData.uid;

          var fbReq = fb.contacts.save(data);

          fbReq.onsuccess = function() {
            window.console.log('OWDSuccess: Saving on indexedDB');

            outReq.done(fbReq.result);
          }
          fbReq.onerror = function() {
            window.console.error('OWDError: Saving on indexedDB');
            outReq.failed(fbReq.error);
          }
           }
      catch(e) { window.console.error('OWDError: ',e); }
        } // mozContactsReq.onsuccess

        mozContactsReq.onerror = function(e) {
          window.console.error('OWDError: mozContacts',e.target.error);
          outReq.failed(mozContactsReq.e.target.error);
        }
      },0);
    }

     return outReq;
  }

  this.getData = function() {
    var out = {};
    var keys = Object.keys(devContact);
    keys.forEach(function(key) {
      out[key] = devContact[key];
    });

    var outReq = new Request();

    window.setTimeout(function do_getdata() {
      var fqreq = fb.contacts.get(get);

      fbreq.onsuccess = function(fbdata) {
        Object.keys(fbdata).forEach(function(field) {
          out[field] = fbdata[field];
        });
        outReq.done(out);
      };

      fbreq.onerror = function() {
        outReq.failed(fbreq);
      }
    },0);

    return outReq;
  }
}
