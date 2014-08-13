'use strict';

var SuffixArrayIndex = function() {
  this._MAX_RESULTS = 10;

  this._wordIndex = Object.create(null);

  this._suffixHash = Object.create(null);
  this._suffixesArray = [];

  this._DB_NAME = 'SFA';
  this._DB_VERSION = 7.0;
  this._STORE_SUFFIXES = 'suffixStore';
}

SuffixArrayIndex.prototype = {

  _createSchema: function si__createSchema(db) {
    if (db.objectStoreNames.contains(this._STORE_SUFFIXES)) {
      db.deleteObjectStore(this._STORE_SUFFIXES);
    }

    db.createObjectStore(this._STORE_SUFFIXES, { keyPath: 'startLetter' });
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
        var trans = self.db.transaction([self._STORE_SUFFIXES], 'readwrite');
        var store1 = trans.objectStore(self._STORE_SUFFIXES);

        store1.clear();

        trans.oncomplete = resolve;
        trans.onerror = trans.onabort = reject;

      }).catch(reject);
    });
  },

  save: function si_save() {
    var self = this;

    return new Promise(function(resolve, reject) {
      self.init().then(function success() {

        self._suffixesArray.sort(function(a, b) {
          return a.localeCompare(b);
        });

        var indexPartition = Object.create(null);
        var wordPartition = Object.create(null);

        var indexData = self.getIndexData();
        var words = Object.keys(indexData.wordIndex);
        words.sort(function(a,b) {
          return a.localeCompare(b);
        });

        var nextWord = '', wordIndex = 0;
        while(nextWord.charAt(0) !== 'a') {
          nextWord = words[wordIndex++];
        }

        var suffixes = Object.keys(indexData.suffixHash);
        suffixes.sort(function(a,b) {
          return a.localeCompare(b);
        });

        var nextSuffix = '', suffixIndexx = 0;
        while(nextSuffix.charAt(0) !== 'a') {
          nextSuffix = suffixes[suffixIndexx++];
        }

        var suffixArray = indexData.suffixesArray;
        var nextSuffixEntry = '', suffixEntryIndex = 0;
        while(nextSuffixEntry.charAt(0) !== 'a') {
          nextSuffixEntry = suffixes[suffixEntryIndex++];
        }

        var suffixHashChunk, wordChunk, suffixesArrayChunk;
        var currentLetter, nextLetter;

        for(var j = 97; j < 123; j++) {
          currentLetter = String.fromCharCode(j);
          nextLetter = currentLetter;

          wordChunk = Object.create(null);
          suffixHashChunk = Object.create(null);
          suffixesArrayChunk = [];

          while(nextLetter === currentLetter) {
            nextWord = words[wordIndex++];

            wordChunk[nextWord] = indexData.wordIndex[nextWord];
            nextLetter = nextWord && nextWord.charAt(0);
          }

          nextLetter = currentLetter;
          while(nextLetter === currentLetter) {
            nextSuffix = suffixes[suffixIndexx++];

            suffixHashChunk[nextSuffix] = indexData.suffixHash[nextSuffix];
            nextLetter = nextSuffix && nextSuffix.charAt(0);
          }

          nextLetter = currentLetter;
          while(nextLetter === currentLetter) {
            nextSuffixEntry = suffixArray[suffixEntryIndex];

            suffixesArrayChunk.push(suffixArray[suffixEntryIndex++]);
            nextLetter = nextSuffixEntry && nextSuffixEntry.charAt(0);
          }

          indexPartition[currentLetter] = {
            suffixHash: suffixHashChunk,
            suffixesArray: suffixesArrayChunk
          }

          wordPartition[currentLetter] = {
            wordIndex: wordChunk
          }
        }

        var trans = self.db.transaction([self._STORE_SUFFIXES], 'readwrite');
        var store = trans.objectStore(self._STORE_SUFFIXES);

        trans.oncomplete = resolve;
        trans.onerror = trans.onabort = reject;

        var chunks = Object.keys(indexPartition);
        for(var j = 0; j < chunks.length; j++) {
          var aChunk = indexPartition[chunks[j]];
          var aWordChunk = wordPartition[chunks[j]];

          aChunk.startLetter = chunks[j];
          aWordChunk.startLetter = 'w_' + chunks[j];

          store.put(aChunk);
          store.put(aWordChunk);
        }
      }).catch(reject);
    });
  },

  index: function (entryList) {
    var self = this;

    return new Promise(function(resolve, reject) {
      entryList.forEach(function(entry) {
        var word = entry.word;
        var normalized = word.toLowerCase();

        if (self._wordIndex[normalized]) {
          self._wordIndex[normalized].push(entry.id);
        }
        else {
          self._wordIndex[normalized] = [entry.id];
          self._createSuffixArray(normalized + '~');
        }
      });

      resolve();
    });
  },

  _createSuffixArray: function(word) {
    for (var j = 0; j < word.length; j++) {
      var suffix = word.substr(j);
      if (!this._suffixHash[suffix]) {
        this._suffixHash[suffix] = Object.create(null);
        this._suffixHash[suffix].wordData = [];
        this._suffixesArray.push(suffix);
      }
      this._suffixHash[suffix].wordData.push({
        word: word,
        position: j + 1
      });
    }
  },

  getIndexData: function() {
    var self = this;
    return {
      wordIndex: self._wordIndex,
      suffixHash: self._suffixHash,
      suffixesArray: self._suffixesArray
    }
  },

  setIndexData: function(indexData) {
    this._wordIndex = indexData.wordIndex;
    this._suffixHash = indexData.suffixHash;
    this._suffixesArray = indexData.suffixesArray;
  },

  _getIndexEntry: function(startLetter) {
    var self = this;

    return new Promise(function(resolve, reject) {
      self.init().then(function success() {
        var trans = self.db.transaction([self._STORE_SUFFIXES], 'readonly');
        var store = trans.objectStore(self._STORE_SUFFIXES);

        var req = store.get(startLetter);

        req.onsuccess = function() {
          resolve(req.result);
        }

        req.onerror = function() {
          reject(req.error && req.error.name);
        }
      }).catch(reject);
    });
  },

  _getEntries: function(matchings) {
    var self = this;

    var then = window.performance.now();

    return new Promise(function(resolve, reject) {
      var matchingList = Object.keys(matchings);
      if (matchingList.length === 0) {
        resolve(matchings);
        return;
      }

      matchingList.sort(function(a, b) {
        return a.localeCompare(b);
      });

      var currentLetter, prevLetter;
      var operations = [];

      for(var j = 0; j < matchingList.length; j++) {
        var matching = matchingList[j];
        var word = matchings[matching].matches[0].word;
        currentLetter = word.charAt(0);

        if (currentLetter !== prevLetter) {
          operations.push(self._getIndexEntry('w_' + currentLetter));
        }
        prevLetter = currentLetter;
      }

      var currentGroup = 0;
      prevLetter = matchingList[0].charAt(0);

      Promise.all(operations).then(function(results) {
        for(var j = 0; j < matchingList.length; j++) {
          var matching = matchingList[j];
          var word = matchings[matching].matches[0].word;
          currentLetter = word.charAt(0);

          if (currentLetter !== prevLetter) {
            currentGroup++;
          }
          matchings[matching].entries =
                            results[currentGroup].wordIndex[word];

          prevLetter = currentLetter;
        }

        var now = window.performance.now();

        console.log('Time for getting entries: ', now - then);

        resolve(matchings);
      });
    });
  },

  search: function search(pPattern) {
    var self = this;

    var then = window.performance.now();

    return new Promise(function(resolve, reject) {
      var out = {};

      var pattern = pPattern.toLowerCase();

      if (!pattern || !pattern.trim()) {
        resolve(out);
        return;
      }

      self._getIndexEntry(pattern.charAt(0)).then(function succss(indexChunk) {
        var suffixesArray = indexChunk.suffixesArray;
        var suffixHash = indexChunk.suffixHash;

        var left = 0, right = suffixesArray.length, mid;
        var matching = false;
        var pointer;
        var state = 0;
        var totalResults = 0;

        while (left < right) {
          mid = Math.floor((left + right) / 2);
          var suffix = suffixesArray[mid];
          var startsWith = suffix.startsWith(pattern);
          pointer = mid;
          while ((startsWith || (matching && state !== 3)) &&
                 totalResults < self._MAX_RESULTS) {
            matching = true;
            if (startsWith) {
              suffix = suffixesArray[pointer];
              var wordList = suffixHash[suffix].wordData;

              wordList.forEach(function(aWord) {
                var wordData = aWord.word.substring(0,
                                                  aWord.word.length - 1);
                var list = [];
                if (out[wordData]) {
                  list = out[wordData].matches;
                }
                else {
                  out[wordData] = Object.create(null);
                  out[wordData].matches = list;
                }
                var obj = {
                  word: wordData,
                  start: aWord.position - 1
                }
                obj.end = obj.start + pattern.length - 1;
                out[wordData].matches.push(obj);
                totalResults++;
              });
            }
            // This part of the code tries to find more words that match
            if (state === 0 || state === 1) {
              pointer++;
              startsWith = suffixesArray[pointer] &&
                            suffixesArray[pointer].startsWith(pattern);
              if (startsWith) {
                state = 1;
              }
              else {
                state = 2;
                pointer = mid - 1;
                startsWith = suffixesArray[pointer] &&
                              suffixesArray[pointer].startsWith(pattern);
              }
            }
            else if (state === 2) {
              pointer--;
              if (pointer < 0) {
                startsWith = false;
                state = 3;
              }
              else {
                startsWith = suffixesArray[pointer].startsWith(pattern);
                if (!startsWith) {
                  state = 3;
                }
              }
            }
          }

          if (matching) {
            break;
          }

          if (pattern.localeCompare(suffix) > 0) {
            left = mid + 1;
          }
          else {
            right = mid;
          }
        }
        var now2 = window.performance.now()
        console.log('Search time in the suffix array: ', now2 - then);

        self._getEntries(out).then(function(result) {
          var now = window.performance.now();
          console.log('Search time: ', now - then);
          resolve(result);
        }).catch(reject);
      });
    });
  }
}
