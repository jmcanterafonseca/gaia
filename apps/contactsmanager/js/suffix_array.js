'use strict';

  var strToIndex = [
    { word: 'banana', id: 23},
    { word: 'murcielago', id: 34 },
    { word: 'jose', id: 34 },
    { word: 'porcelana', id: 45}
  ];

  var wordIndex = Object.create(null);

  var suffixHash = Object.create(null);
  var suffixesArray = [];

  function index(entry) {
    var tokens = entry.word.split(/\s+/);
    tokens.forEach(function(aToken) {
      var normalized = aToken.toLowerCase();
      if (wordIndex[normalized]) {
        wordIndex[normalized].push(entry.id);
      }
      else {
        wordIndex[normalized] = [entry.id];
        createSuffixArray(normalized + '$');
      }
    });
  }

  function createSuffixArray(word) {
    for (var j = 0; j < word.length; j++) {
      var suffix = word.substr(j);
      if (!suffixHash[suffix]) {
        suffixHash[suffix] = Object.create(null);
        suffixHash[suffix].wordData = [];
        suffixesArray.push(suffix);
      }
      suffixHash[suffix].wordData.push({
        word: word,
        position: j + 1
      });
    }

    suffixesArray.sort(function(a, b) {
      return a.localeCompare(b);
    });
  }

  for (var j = 0; j < strToIndex.length; j++) {
    index(strToIndex[j]);
  }
  console.log(JSON.stringify(suffixesArray));

  function search(pPattern) {
    return new Promise(function(resolve, reject) {
      var out = {};

      var pattern = pPattern.toLowerCase();

      if (!pattern || !pattern.trim()) {
        resolve(out);
        return;
      }

      var left = 0, right = suffixesArray.length, mid;
      var matching = false;
      var pointer;
      var state = 0;
      while (left < right) {
        mid = Math.floor((left + right) / 2);
        var suffix = suffixesArray[mid];
        var startsWith = suffix.startsWith(pattern);
        pointer = mid;
        while (startsWith || (matching && state !== 3) ) {
          matching = true;
          if (startsWith) {
            suffix = suffixesArray[pointer];
            var wordList = suffixHash[suffix].wordData;

            wordList.forEach(function(aWord) {
              var wordData = aWord.word.substring(0,
                                                aWord.word.length - 1);
              if (out[wordData]) {
                return;
              }
              var obj = {
                word: wordData,
                start: aWord.position - 1,
                entries: wordIndex[aWord.word]
              }
              obj.end = obj.start + pattern.length - 1;
              out[wordData] = obj;
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
