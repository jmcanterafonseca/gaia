'use strict';


var SuffixArrayIndexedDB = function() {
  this._MAX_RESULTS = 10;

  // Minimum length of a matching for being reported
  this._THRESHOLD_LENGHT = 6;

  this._DB_NAME = 'DB';
  this._DB_VERSION = 3.0;
  this._STORE_SUFFIXES = 'suffixStore';
  this._STORE_WORDS = 'wordsStore';

  this._numResults = 0;
};

SuffixArrayIndexedDB.prototype = {

  init: function si_init() {
    var self = this;

    if (self.db) {
      return Promise.resolve(self.db);
    }

    return new Promise(function(resolve, reject) {
      var req = window.indexedDB.open(self._DB_NAME, self._DB_VERSION);

      req.onupgradeneeded = function(e) {
        var db = e.target.result;
        self._createSchema(db);
      };

      req.onsuccess = function() {
        self.db = req.result;
        resolve(self.db);
      };

      req.onerror = function() {
        console.error('Error while getting Database: ', req.error &&
                      req.error.name);
        reject(req.error);
      };
    });
  },

  index: function si_index(entry) {
    var self = this;

    return new Promise(function(resolve, reject) {
      self.init().then(function success() {
        var tokens = entry.word.split(/\s+/);

        var operations = [];

        tokens.forEach(function(aToken) {
          var normalized = aToken.toLowerCase();

          operations.push(self._doIndex(normalized, entry.id));
        });

        Promise.all(operations).then(resolve, reject);
      }).catch (function error(err) {
          console.error('Error while indexing: ', err && err.name);
          reject(err);
      });
    });
  },

  _doIndex: function si__doIndex(token, entryId) {
    var self = this;

    return new Promise(function(resolve, reject) {
      self._createWordEntry(token, entryId).then(function() {
        return self._createSuffixArray(token);
      }).then(resolve).catch(reject);
    });
  },

  _createWordEntry: function si__createWordEntry(word, entryId) {
    var self = this;

    var then = window.performance.now();

    return new Promise(function(resolve, reject) {
      var db = self.db;

      var trans = db.transaction([self._STORE_WORDS], 'readonly');
      var store = trans.objectStore(self._STORE_WORDS);

      var req = store.get(word);

      req.onsuccess = function() {
        var entries, obj;
        if (req.result) {
          obj = req.result;
          entries = obj.entries;
          if (entries.indexOf(entryId) === -1) {
            entries.push(entryId);
          }
        }
        else {
          obj = {
            word: word,
            entries: [entryId]
          };
        }

        var trans2 = db.transaction([self._STORE_WORDS], 'readwrite');
        var store2 = trans2.objectStore(self._STORE_WORDS);
        var req2 = store2.put(obj);
        req2.onsuccess = function() {
          var now = window.performance.now();
          console.log('Time for creating a word entry: ', now - then);
          resolve();
        };
        req2.onerror = reject;
      }; // req.onsuccess

      req.onerror = reject;
    });
  },

  _createSchema: function si__createSchema(db) {
    if (db.objectStoreNames.contains(this._STORE_SUFFIXES)) {
      db.deleteObjectStore(this._STORE_SUFFIXES);
    }

    db.createObjectStore(this._STORE_SUFFIXES, { keyPath: 'suffix' });

    if (db.objectStoreNames.contains(this._STORE_WORDS)) {
      db.deleteObjectStore(this._STORE_WORDS);
    }

    db.createObjectStore(this._STORE_WORDS, { keyPath: 'word' });
  },

  _getSuffixHashEntry: function si__getSuffixHashEntry(suffix) {
    var self = this;

    return new Promise(function(resolve, reject) {
      var trans = self.db.transaction([self._STORE_SUFFIXES], 'readonly');
      var store = trans.objectStore(self._STORE_SUFFIXES);

      var req = store.get(suffix);
      req.onsuccess = function() {
        resolve(req.result);
      };
      req.onerror = function() {
        reject(req.error);
      };
    });
  },

  _updateSuffixHashEntry: function si__updateSuffixHashEntry(entry) {
    var self = this;

    return new Promise(function(resolve, reject) {
      var trans = self.db.transaction([self._STORE_SUFFIXES], 'readwrite');
      var store = trans.objectStore(self._STORE_SUFFIXES);

      var req = store.put(entry);
      req.onsuccess = function() {
        resolve();
      };
      req.onerror = function() {
        reject(req.error);
      };
    });
  },

  _createEntry: function si__createEntry(suffix, word) {
    var self = this;

    return new Promise(function(resolve, reject) {
      self._getSuffixHashEntry(suffix).then(function(entry) {
        if (!entry) {
          entry = Object.create(null);
          entry.suffix = suffix;
          entry.wordData = [];
        }

        entry.wordData.push(word);

        return self._updateSuffixHashEntry(entry);
      }).then(resolve, reject).catch (function error(err) {
          console.error('Error while creating entry: ', err);
          reject();
      });
    });
  },

  _createSuffixArray: function si__createSuffixArray(word) {
    var self = this;

    word += '~';

    var then = window.performance.now();

    return new Promise(function(resolve, reject) {
      var operations = [];

      for (var j = 0; j < word.length; j++) {
        var suffix = word.substr(j);
        operations.push(self._createEntry(suffix, word, j));
      }

      Promise.all(operations).then(function() {
        var now = window.performance.now();
        console.log('Time employed in indexing: ', now - then);
        resolve();
      }, reject);
    });
  },

  _getEntriesForWord: function si__getEntriesForWord(word) {
    var self = this;

    return new Promise(function(resolve, reject) {
      var trans = self.db.transaction([self._STORE_WORDS]);
      var store = trans.objectStore(self._STORE_WORDS);

      var req = store.get(word);
      req.onsuccess = function() {
        resolve(req.result.entries);
      };

      req.onerror = reject;
    });
  },

  search: function si_search(pPattern) {
    var self = this;

    return new Promise(function(resolve, reject) {
      self.init().then(function() {
        var out = {};

        var pattern = pPattern.toLowerCase();

        if (!pattern || !pattern.trim()) {
          resolve(out);
          return;
        }

        var trans = self.db.transaction([self._STORE_SUFFIXES], 'readonly');
        var store = trans.objectStore(self._STORE_SUFFIXES);

        var req2 = store.openCursor(IDBKeyRange.bound(pattern, pattern + '~',
                                                      false, false));
        self._numResults = 0;

        // This array will hold potential candidates that do not have a
        // a minimum length but that may finally enter into the result set
        var candidates = [];

        req2.onsuccess = function() {
          var cursor = req2.result;

          if (cursor && self._numResults < self._MAX_RESULTS) {
            var wordList = cursor.value.wordData;
            wordList.sort(function(a, b) {
              return b.length - a.length;
            });

            for (var j = 0; j < wordList.length &&
                 self._numResults < self._MAX_RESULTS; j++) {
              var aWord = wordList[j];
              var wordData = aWord.substring(0, aWord.length - 1);
              if (out[wordData]) {
                break;
              }
              else if (wordData.length < self._THRESHOLD_LENGHT) {
                candidates.push(wordData);
                break;
              }
              else {
                self._fillResult(wordData, pattern, out);
              }
            }
            if (self._numResults < self._MAX_RESULTS) {
              console.log('Cursor continue');
              cursor.continue();
            }
            else {
              console.log('End of search 1');
              self._endOfSearch(out, pattern, candidates, resolve, reject);
            }
          }
          else {
            console.log('End of search 2');
            self._endOfSearch(out, pattern, candidates, resolve, reject);
          }
        }; // req2.onsuccess

        req2.onerror = function() {
          console.error('Error while opening the cursor', req.error &&
                        req.error.name);
          reject(req.error);
        };
      }).catch (function error(err) {
          console.error('Error while searching', err && err.name);
          reject(err);
      });
    });
  },

  _fillResult: function si_fillResult(wordData, pattern, out) {
    var self = this;

    out[wordData] = Object.create(null);
    out[wordData].matches = [];
    self._numResults++;

    // Determine all the possible ocurrences
    var start = 0;
    var index = wordData.indexOf(pattern, start);

    while (index !== -1) {
      //code
      var obj = {
        start: index
      };

      obj.end = obj.start + pattern.length - 1;
      out[wordData].matches.push(obj);
      start = obj.end + 1;

      index = wordData.indexOf(pattern, start);
    }
  },

  _endOfSearch: function si__endOfSearch(out, pattern, candidates,
                                         resolve, reject) {
    var self = this;

    // Completing the result set if necessary
    var totalSoFar = Object.keys(out).length;
    var remaining = self._MAX_RESULTS - totalSoFar;
    if (remaining > 0) {
      candidates.sort(function(a, b) {
        b.length - a.length
      });
      for(var j = 0; j < candidates.length && remaining > 0; j++) {
        self._fillResult(candidates[j], pattern, out);
        remaining--;
      }
    }

    var ops = [];
    var targetWords = Object.keys(out);
    if (targetWords.length === 0) {
      resolve(out);
      return;
    }

    targetWords.forEach(function(aWord) {
      ops.push(self._getEntriesForWord(aWord));
    });

    Promise.all(ops).then(function success(entries) {
      entries.forEach(function(aEntry, index) {
        out[targetWords[index]].entries = aEntry;
      });

      resolve(out);
    }).catch (function error(err) {
        console.error('Error while obtaining the concerned entries',
                      err && err.name);
        reject(err);
    });
  }
};
