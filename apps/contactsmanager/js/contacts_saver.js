'use strict';

var fields = [
  'givenName',
  'familyName',
  'org',
  'email'
];

var suffixIndex = new SuffixArrayIndex();
var suffixIndexedDB = new SuffixArrayIndexedDB();

function ContactsSaver(data) {
  this.data = data;
  var next = 0;
  var self = this;

  var lock;

  this.start = function() {
    lock = navigator.requestWakeLock('cpu');

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

      var listToIndex = [];

      fields.forEach(function(aField) {
        if (aField === 'email') {
          console.log(cnt[aField] && cnt[aField][0].value);
        }
        if (!Array.isArray(cnt[aField]) || !cnt[aField][0]) {
          return;
        }

        if (aField === 'email') {
          console.log(cnt[aField][0].value);
        }

        var entry = {
          word: cnt[aField][0].value || cnt[aField][0],
          id: cnt.id
        };

        suffixIndex.index(entry);

        listToIndex.push(entry);
      });

      indexWordList(listToIndex).then(function() {
        if (typeof self.onsaved === 'function') {
          self.onsaved(next + 1);
        }
        continuee();
      }).catch(function(err) {
          console.error('Error while indexing DB', err && err.name);
      });
    };

    req.onerror = function(e) {
      if (typeof self.onerror === 'function') {
        self.onerror(self.data[next], e.target.error);
      }
    };
  }

  function indexWordList(wordList) {
    return new Promise(function(resolve, reject) {
      var sequence = Promise.resolve();

      var numExecs = 0;
      wordList.forEach(function(entry, index) {
        sequence = sequence.then(function() {
          return suffixIndexedDB.index(entry);
        }).then(function() {
            numExecs++;
            if (numExecs === wordList.length) {
              resolve();
            }
        }).catch(reject);
      });
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
            lock.unlock();

            self.onsuccess();
          }
    }
  }
}
