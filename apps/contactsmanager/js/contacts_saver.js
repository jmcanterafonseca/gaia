'use strict';

var fields = [
  'givenName',
  'familyName',
  'org'
];

var suffixIndex = new SuffixIndex();

function ContactsSaver(data) {
  this.data = data;
  var next = 0;
  var self = this;

  this.start = function() {
    saveContact(data[0]);
  };

  function saveContact(cdata) {
    if (cdata.bday) {
      cdata.bday = new Date(cdata.bday);
    }
    if (cdata.anniversary) {
      cdata.anniversary = new Date(cdata.anniversary);
    }
    var contact = new mozContact(cdata);
    var req = navigator.mozContacts.save(contact);

    req.onsuccess = function(e) {
        var cnt = contact;

        fields.forEach(function(aField) {
          if (!Array.isArray(cnt[aField]) || !cnt[aField][0]) {
            return;
          }

          var entry = {
            word: cnt[aField][0],
            id: cnt.id
          };

          suffixIndex.index(entry);
      });

      if (typeof self.onsaved === 'function') {
        self.onsaved(next + 1);
      }
      continuee();
    };

    req.onerror = function(e) {
      if (typeof self.onerror === 'function') {
        self.onerror(self.data[next], e.target.error);
      }
    };
  }

  function continuee() {
    next++;
    if (next < self.data.length) {
      saveContact(self.data[next]);
    }
    else {
          // End has been reached
          if (typeof self.onsuccess === 'function') {
            self.onsuccess();
          }
    }
  }
}
