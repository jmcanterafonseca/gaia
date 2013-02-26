if (!window.LiveConnector) {
  window.LiveConnector = (function() {
    var LIVE_ENDPOINT = 'https://apis.live.net/v5.0/';
    var CONTACTS_RESOURCE = 'me/contacts';
    var PICTURE_RESOURCE = '/picture';

    var itemsTypeMap = {
      'personal': 'personal',
      'mobile': 'mobile',
      'business': 'work',
      'other': 'another',
      'preferred': 'personal'
    };

    function live2MozContact(liveContact) {
      var out = {};

      out.givenName = [liveContact.first_name || ''];
      out.familyName = [liveContact.last_name || ''];
      out.name = [liveContact.name || ''];

      var byear = liveContact.birth_year;
      var bmonth = liveContact.birth_month;
      var bday = liveContact.birth_day;
      if (bmonth && bday) {
        var birthdate = out.bday = new Date();
        birthdate.setDate(bday);
        birthdate.setMonth(bmonth, bday);
        if (byear) {
          birthdate.setYear(byear);
        }
      }

      out.tel = [];
      out.email = [];
      out.adr = [];

      var liveEmails = liveContact.emails || {};
      var alreadyAddedEmails = {};
      Object.keys(liveEmails).forEach(function(emailType) {
        var emailValue = liveEmails[emailType];
        if (emailValue &&
           typeof alreadyAddedEmails[emailValue] === 'undefined') {
            out.email.push({
            type: [itemsTypeMap[emailType]],
            value: emailValue
          });
        alreadyAddedEmails[emailValue] = true;
        }
      });

      var livePhones = liveContact.phones || {};
      Object.keys(livePhones).forEach(function(phoneType) {
        var phoneValue = livePhones[phoneType];
        if (phoneValue) {
          out.tel.push({
            type: [itemsTypeMap[phoneType]],
            value: phoneValue
          });
        }
      });

      var liveAddresses = liveContact.addresses || {};
      Object.keys(liveAddresses).forEach(function(addrType) {
        var addrValue = liveAddresses[addrType];
        if (addrValue) {
          out.adr.push(fillAddress(itemsTypeMap[addrType], addrValue));
        }
      });

      return out;
    }

    function fillAddress(addrType, addrValue) {
      var out = {};
      out.type = [];
      out.type.push(addrType);

      out.streetAddress = addrValue.street || '';
      out.locality = addrValue.city || '';
      out.region = addrValue.state || '';
      out.countryName = addrValue.region || '';
      out.postalCode = addrValue.postal_code || '';

      return out;
    }

    function LiveImporter(pContacts,access_token) {
      this.contacts = Object.keys(pContacts);
      var contactsHash = pContacts;
      var total = this.contacts.length;
      var CHUNK_SIZE = 5;
      var numResponses = 0;
      var next = 0;
      var self = this;

      function contactSaved(e) {
        if (typeof self.oncontactimported) {
          window.setTimeout(self.oncontactimported, 0);
        }
        continueCb();
      }

      function saveMozContact(deviceContact) {
        var mzContact = new mozContact();
        mzContact.init(deviceContact);

        var req = navigator.mozContacts.save(deviceContact);

        req.onsuccess = contactSaved;
        req.onerror = function() {
          window.console.error('Error while importing contact: ',
                               req.error.name);
        };
      }

      function pictureReady(blobPicture) {
        var deviceContact = live2MozContact(this);
        deviceContact.photo = [];
        deviceContact.photo[0] = blobPicture;

        saveMozContact(deviceContact);
      }

      function pictureError() {
        window.console.error('Error while getting picture for contact: ',
                             this.user_id);
        saveMozContact(live2MozContact(this));
      }

      function pictureTimeout() {
        window.console.warn('Timeout while getting picture for contact: ',
                             this.user_id);
        saveMozContact(live2MozContact(this));
      }

      this.start = function() {
        importContacts(next);
      };

      function importContacts(from) {
        for (var i = from; i < from + CHUNK_SIZE && i < total; i++) {
          var liveContact = contactsHash[self.contacts[i]];
          // We need to get the picture
          var callbacks = {
            success: pictureReady.bind(liveContact),
            error: pictureError.bind(liveContact),
            timeout: pictureTimeout.bind(liveContact)
          };

          window.LiveConnector.downloadContactPicture(liveContact.user_id,
                                               access_token, callbacks);
        }
      }

      function continueCb() {
        next++;
        numResponses++;
        if (next < total && numResponses === CHUNK_SIZE) {
          numResponses = 0;
          importContacts(next);
        }
        else if (next >= total) {
          // End has been reached
          if (typeof self.onsuccess === 'function') {
            window.setTimeout(self.onsuccess, 0);
          }
        }
      }
    }

    function LiveConnector() {
    }

    LiveConnector.prototype = {
      listAllContacts: function(access_token, callbacks) {

        var uriElements = [LIVE_ENDPOINT, CONTACTS_RESOURCE, '?',
                           'access_token', '=', access_token];

        return Rest.get(uriElements.join(''), callbacks);
      },

      getImporter: function(contactsList, access_token) {
        return new LiveImporter(contactsList, access_token);
      },

      downloadContactPicture: function(contactId, access_token, callbacks) {
        var uriElements = [LIVE_ENDPOINT, contactId, PICTURE_RESOURCE,
                           '?', 'access_token', '=', access_token];

        return Rest.get(uriElements.join(''), callbacks, {
          responseType: 'blob'
        });
      }
    };

    return new LiveConnector();
  })();
}
