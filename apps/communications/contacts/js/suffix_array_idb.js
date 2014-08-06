'use strict';

var SuffixArrayIndexedDB = function() {
  this._MAX_RESULTS = 10;

  // Minimum length of a matching for being reported
  this._THRESHOLD_LENGHT = 6;

  this._DB_NAME = 'SFA';
  this._DB_VERSION = 11.0;
  this._STORE_SUFFIXES = 'suffixStore';
  this._STORE_WORDS = 'wordsStore';

  this._INDEX_BY_WORD = 'byWord';

  this._numResults = 0;
};

SuffixArrayIndexedDB.prototype = {

   _createSchema: function si__createSchema(db) {
    if (db.objectStoreNames.contains(this._STORE_SUFFIXES)) {
      db.deleteObjectStore(this._STORE_SUFFIXES);
    }

    db.createObjectStore(this._STORE_SUFFIXES, { keyPath: 'suffix' });

    if (db.objectStoreNames.contains(this._STORE_WORDS)) {
      db.deleteObjectStore(this._STORE_WORDS);
    }

    var objStore = db.createObjectStore(this._STORE_WORDS,
                                        { autoIncrement: true });
    objStore.createIndex(this._INDEX_BY_WORD, 'word', { unique: true });
  },

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

  clear: function si_clear() {
    var self = this;

    return new Promise(function(resolve, reject) {
      self.init().then(function success() {
        var trans = self.db.transaction([self._STORE_SUFFIXES,
                                         self._STORE_WORDS], 'readwrite');
        var store1 = trans.objectStore(self._STORE_SUFFIXES);
        var store2 = trans.objectStore(self._STORE_WORDS);

        store1.clear();
        store2.clear();

        trans.oncomplete = resolve;
        trans.onerror = trans.onabort = reject;

      }).catch(reject);
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

        Promise.all(operations).then(function onSuffixReady(results) {
          self._persistSuffixArray(results[1], results[0]).then(
                                                              resolve, reject);
        }, reject);
      }).catch (function error(err) {
          console.error('Error while indexing: ', err);
          reject(err);
      });
    });
  },

  _createWordEntries: function si__createWordEntries(entryList) {
    var self = this;

    var then = window.performance.now();

    var wordSet = Object.create(null);

    return new Promise(function(resolve, reject) {
      var trans = self.db.transaction([self._STORE_WORDS], 'readwrite');
      var store = trans.objectStore(self._STORE_WORDS);
      var wordIndex = store.index(self._INDEX_BY_WORD);

      for(var i = 0; i < entryList.length; i++) {
        var entry = entryList[i];

        var entryId = entry.id;

        var word = entry.word.toLowerCase();

        var req = wordIndex.openCursor(IDBKeyRange.only(word));

        req.onerror = function() {
          console.error('Error while obtaining data from the index',
                        req.error && req.error.name);
          reject(req.error && req.error.name);
        }

        req.onsuccess = function(theWord, theEntryId) {
          var entries, obj, cursor;
          cursor = this.result;

          if (this.result) {
            obj = cursor.value;
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

          var objId = cursor && cursor.primaryKey;
          var putReq = store.put(obj, objId);
          putReq.onsuccess = function(aWord) {
            wordSet[aWord] = this.result;
          }.bind(putReq, theWord);

          putReq.onerror = function(aWord, theObj) {
            console.error('Error while putting: ', aWord,
                          JSON.stringify(wordSet), JSON.stringify(theObj),
                          objId);
          }.bind(putReq, theWord, obj, objId);

        }.bind(req, word, entryId); // req.onsuccess
      } // for entryList

      trans.oncomplete = function() {
        var now = window.performance.now();
        console.log('Time for creating word entries: ', now - then);
        resolve(wordSet);
      };
      trans.onerror = trans.onabort = reject;
    });
  },

  _createSuffixArray: function si__createSuffixArray(entryList) {
    var self = this;

    var then = window.performance.now();

    return new Promise(function(resolve, reject) {
      var suffixes = Object.create(null);

      for(var i = 0; i < entryList.length; i++) {
        var entry = entryList[i];
        var word = entry.word.toLowerCase() + '~';

        for (var j = 0; j < word.length; j++) {
          var suffix = word.substr(j);
          suffixes[suffix] = suffixes[suffix] || [];
          suffixes[suffix].push(word.substring(0, word.length - 1));
        }
      }

      resolve(suffixes);
    });
  },

  _persistSuffixArray: function si__persistSuffixArray(suffixes, wordSet) {
    var self = this;

    return new Promise(function(resolve, reject) {
      var suffixesList = Object.keys(suffixes);

      var trans = self.db.transaction([self._STORE_SUFFIXES], 'readwrite');
      var store = trans.objectStore(self._STORE_SUFFIXES);
      for(var i = 0; i < suffixesList.length; i++) {
        var suffix = suffixesList[i];

        var req = store.get(suffix);
        req.onsuccess = function(theSuffix) {
          var entry = this.result;

          if (!entry) {
            entry = Object.create(null);
            entry.suffix = theSuffix;
            entry.wordData = [];
          }

          var wordData = entry.wordData;

          var wordDataList = [];
          var wordList = suffixes[theSuffix];
          for(var j = 0; j < wordList.length; j++) {
            var id = wordSet[wordList[j]];
            if (wordData.indexOf(id) === -1) {
              wordDataList.push(id);
            }
          }
          entry.wordData = entry.wordData.concat(wordDataList);
          store.put(entry);
        }.bind(req, suffix);

        req.onerror = function(e) {
          reject(e.target.error);
        };
      }

      trans.oncomplete = resolve;
      trans.onerror = trans.onabort = reject;
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

        var wordIdList = [];

        req2.onsuccess = function() {
          var cursor = req2.result;

          if (cursor && self._numResults < self._MAX_RESULTS * 3) {
            wordIdList = wordIdList.concat(cursor.value.wordData);
            self._numResults += cursor.value.wordData.length;

            if (self._numResults < self._MAX_RESULTS * 3) {
              console.log('Cursor continue');
              cursor.continue();
            }
            else {
              console.log('End of search 1');
              self._endOfSearch(out, wordIdList, pattern, candidates, resolve, reject);
            }
          }
          else {
            console.log('End of search 2');
            self._endOfSearch(out, wordIdList, pattern, candidates, resolve, reject);
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

  _getWordList: function si__getWordList(wordListId) {
    var self = this;

    return new Promise(function(resolve, reject) {
      var db = self.db;
      var trans = db.transaction([self._STORE_WORDS], 'readonly');
      var storage = trans.objectStore(self._STORE_WORDS);

      wordListId.sort(function(a, b) {
        return a - b;
      });

      var result = [];
      var responses = 0;

      var req = storage.openCursor(IDBKeyRange.bound(wordListId[0],
                                    wordListId[wordListId.length - 1],
                                      false, false));

      var numResults = 0;
      req.onsuccess = function(e) {
        var cursor = req.result;
        if (cursor && numResults < self._MAX_RESULTS) {
          var val = cursor.value;
          var obj = {
            word: val.word,
            entries: val.entries.slice(0, self._MAX_RESULTS)
          };
          result.push(obj);
          numResults += obj.entries.length;

          cursor.continue(wordListId[++responses]);
        }
        else {
          result.sort(function(a, b) {
            return b.word.length - a.word.length;
          });
          resolve(result);
        }
      }

      req.onerror = function() {
        reject(req.error);
      }
    });
  },

  _fillResult: function si__fillResult(pwordData, pattern, out) {
    var self = this;

    var wordData = pwordData.word;

    out[wordData] = Object.create(null);
    out[wordData].entries = pwordData.entries;
    out[wordData].matches = [];

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

  _endOfSearch: function si__endOfSearch(out, wordIdList, pattern, candidates,
                                         resolve, reject) {
    var self = this;

    if (wordIdList.length === 0) {
      resolve(Object.create(null));
      return;
    }

    self._getWordList(wordIdList).then(function wListReady(wordList) {
      for (var j = 0; j < wordList.length; j++) {
        var wordData = wordList[j].word;

        if (out[wordData]) {
          break;
        }
        else if (wordData.length < self._THRESHOLD_LENGHT) {
          candidates.push(wordList[j]);
          break;
        }
        else {
          self._fillResult(wordList[j], pattern, out);
        }
      }

      // Completing the result set if necessary
      var totalSoFar = Object.keys(out).length;
      var remaining = self._MAX_RESULTS - totalSoFar;
      if (remaining > 0) {
        candidates.sort(function(a, b) {
          b.word.length - a.word.length
        });
        for(var j = 0; j < candidates.length && remaining > 0; j++) {
          self._fillResult(candidates[j], pattern, out);
          remaining--;
        }
      }

      resolve(out);
    });
  }
};
