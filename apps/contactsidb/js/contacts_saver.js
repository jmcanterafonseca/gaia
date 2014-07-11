'use strict';

function ContactsSaver(data) {
  this.data = data;
  var next = 0;
  var self = this;

  var counter = 1;

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

    cdata.id = 'a' + counter;
    counter++;
    var contact = cdata;

    ContactsData.save(contact).then(function(e) {
      if (typeof self.onsaved === 'function') {
        self.onsaved(next + 1);
      }
      continuee();
    }).catch(function(error) {
      if (typeof self.onerror === 'function') {
        self.onerror(self.data[next], error);
      }
    });
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
