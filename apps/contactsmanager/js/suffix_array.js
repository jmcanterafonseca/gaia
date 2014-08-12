'use strict';

var SuffixArrayIndex = function() {
  this._MAX_RESULTS = 10;

  this._wordIndex = Object.create(null);

  this._suffixHash = Object.create(null);
  this._suffixesArray = [];
}

SuffixArrayIndex.prototype = {

  index: function (entry) {
    var self = this;

    var tokens = entry.word.split(/\s+/);

    tokens.forEach(function(aToken) {
      var normalized = aToken.toLowerCase();
      if (self._wordIndex[normalized]) {
        self._wordIndex[normalized].push(entry.id);
      }
      else {
        self._wordIndex[normalized] = [entry.id];
        self._createSuffixArray(normalized + '~');
      }
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

    this._suffixesArray.sort(function(a, b) {
      return a.localeCompare(b);
    });
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

  search: function search(pPattern) {
    var self = this;

    return new Promise(function(resolve, reject) {
      var out = {};

      var pattern = pPattern.toLowerCase();

      if (!pattern || !pattern.trim()) {
        resolve(out);
        return;
      }

      var suffixesArray = self._suffixesArray;

      console.log(JSON.stringify(suffixesArray));

      var left = 0, right = self._suffixesArray.length, mid;
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
            var wordList = self._suffixHash[suffix].wordData;

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
                start: aWord.position - 1,
                entries: self._wordIndex[aWord.word]
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

      resolve(out);
    });
  }
}
