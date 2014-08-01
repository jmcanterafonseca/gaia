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

  index: function si_index(entryList) {
    var self = this;

    return new Promise(function(resolve, reject) {
      var then = window.performance.now();

      var operations = [];

      self.init().then(function success() {
        operations.push(self._createWordEntries(entryList));
        operations.push(self._createSuffixArray(entryList));

        Promise.all(operations).then(resolve, reject);
      }).catch (function error(err) {
          console.error('Error while indexing: ', err);
          reject(err);
      });
    });
  },

  _createWordEntries: function si__createWordEntries(entryList) {
    var self = this;

    var then = window.performance.now();

    return new Promise(function(resolve, reject) {
      var trans = self.db.transaction([self._STORE_WORDS], 'readwrite');
      var store = trans.objectStore(self._STORE_WORDS);

      for(var i = 0; i < entryList.length; i++) {
        var entry = entryList[i];

        var tokens = entry.word.split(/\s+/);
        var entryId = entry.id;

        for(var j = 0; j < tokens.length; j++) {
          var word = tokens[j].toLowerCase();

          var req = store.get(word);

          req.onsuccess = function(theWord, theEntryId) {
            var entries, obj;
            if (this.result) {
              obj = this.result;
              entries = obj.entries;
              if (entries.indexOf(theEntryId) === -1) {
                entries.push(theEntryId);
              }
            }
            else {
              obj = {
                word: theWord,
                entries: [theEntryId]
              };
            }

            store.put(obj);
            trans.oncomplete = function() {
              var now = window.performance.now();
              console.log('Time for creating word entries: ', now - then);
              resolve();
            };
            trans.onerror = reject;
          }.bind(req, word, entryId); // req.onsuccess
        } // for tokens
      }
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

  _createSuffixArray: function si__createSuffixArray(entryList) {
    var self = this;

    var then = window.performance.now();

    return new Promise(function(resolve, reject) {
      var trans = self.db.transaction([self._STORE_SUFFIXES], 'readwrite');
      var store = trans.objectStore(self._STORE_SUFFIXES);

      var suffixes = Object.create(null);

      for(var i = 0; i < entryList.length; i++) {
        var entry = entryList[i];
        var wordList = entry.word.split(/\s+/);

        for(var t = 0; t < wordList.length; t++) {
          var word = wordList[t].toLowerCase() + '~';

          for (var j = 0; j < word.length; j++) {
            var suffix = word.substr(j);
            suffixes[suffix] = suffixes[suffix] || [];
            suffixes[suffix].push(word);
          }
        }
      }

      var suffixesList = Object.keys(suffixes);

      for(var i = 0; i < suffixesList.length; i++) {
        var suffix = suffixesList[i];

        var req = store.get(suffix);
        req.onsuccess = function(theSuffix, theWord) {
          var entry = this.result;

          if (!entry) {
            entry = Object.create(null);
            entry.suffix = theSuffix;
            entry.wordData = suffixes[theSuffix];
          }

          entry.wordData.concat(suffixes[theSuffix]);
          store.put(entry);
        }.bind(req, suffix, word);

        req.onerror = function(e) {
          reject(e.target.error);
        };
      }

      trans.oncomplete = resolve;
      trans.onerror = reject;
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
