var datastore;

navigator.getDataStores('Global_Contacts').then(function(dsList) {
  datastore = dsList[0];

  navigator.mozContacts.oncontactchange = function(event) {
    return;
    console.log('Contact change: ', event.reason);

    var reason = event.reason;
    if (reason === 'create') {
      console.log('Adding record');

      var req = navigator.mozContacts.find({
        filterBy: ['id'],
        filterValue: event.contactID
      });

      req.onsuccess = function() {
        var contact = req.result[0];

        fields.forEach(function(aField) {
          if (!Array.isArray(contact[aField]) || !contact[aField][0]) {
            return;
          }

          var entry = {
            word: contact[aField][0],
            id: contact.id
          };
          index(entry);
        });
      }

      req.onerror = function() {
        console.error('Error while obtaining contact entry');
      }
    }
  }
});

var FILE_NAME = 'indexSerialized.json';
document.getElementById('bt_persist').onclick = function() {
  var theIndex = suffixIndex.getIndexData();

  console.log('Persisting ...');

  var storage = navigator.getDeviceStorage('sdcard');
  var blobContent = [JSON.stringify(theIndex)];

  var reqDel = storage.delete(FILE_NAME);
  reqDel.onsuccess = function() {
    saveIndex(storage, blobContent);
  }

  reqDel.onerror = function() {
    console.warn('Old file could not be deleted');
    saveIndex(storage, blobContent);
  }
}

function saveIndex(storage, blobContent) {
  var indexPartition = Object.create(null);

  var indexData = suffixIndex.getIndexData();
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
      nextLetter = nextWord.charAt(0);
    }

    nextLetter = currentLetter;
    while(nextLetter === currentLetter) {
      nextSuffix = suffixes[suffixIndexx++];

      suffixHashChunk[nextSuffix] = indexData.suffixHash[nextSuffix];
      nextLetter = nextSuffix.charAt(0);
    }

    nextLetter = currentLetter;
    while(nextLetter === currentLetter) {
      nextSuffixEntry = suffixArray[suffixEntryIndex];

      suffixesArrayChunk.push(suffixArray[suffixEntryIndex++]);
      nextLetter = nextSuffixEntry.charAt(0);
    }

    indexPartition[currentLetter] = {
      wordIndex: wordChunk,
      suffixHash: suffixHashChunk,
      suffixesArray: suffixesArrayChunk
    }

    console.log('Index partition: ', Object.keys(indexPartition).length);
  }

  var req = storage.addNamed(new Blob(blobContent, {type: 'application/json'}),
                              FILE_NAME);

  req.onsuccess = function() {
    var operations = [];
    var chunks = Object.keys(indexPartition);

    console.log(JSON.stringify(chunks));

    /*
    operations.push();
    Promise.all(operations).then(function() {
      console.log('All the chunks have been saved');
    }).catch(function error(err) {
        console.error('Error: ', err && err.name);
    });
    */

    chunks.forEach(function(aChunk) {
      datastore.put(indexPartition[aChunk], aChunk).then(function success(theChunk) {
        console.log('Chunk saved: ', theChunk);
      }.bind(aChunk)).catch(function error(theChunk, err) {
          console.error('Error in chunk: ', theChunk, err && err.name);
      }.bind(aChunk));
    });

    var req2 = storage.get(FILE_NAME);
    req2.onsuccess = function() {
      var file = req2.result;
      console.log('Index size as JSON: ', file.size);
    }

    req2.onerror = function() {
      console.error('Error while getting size: ', req2.error.name);
    }
  }

  req.onerror = function() {
    console.error('Error while persisting the index', req.error.name);
  }
}

document.getElementById('bt_load_cts').onclick = function() {
  document.getElementById('status').textContent = 'Loading ...';
  ct_loadContacts();
}

document.getElementById('bt_load_index').onclick = function() {
  document.getElementById('status').textContent = 'Loading ...';
  datastore.get(1).then(function(obj) {
    suffixIndex.setIndexData(obj);
    document.getElementById('status').textContent = '';
  });
}

var list = document.getElementById('search-result');

document.getElementById('search-term').addEventListener('input', function(e) {
  var value = e.target.value;

  list.innerHTML = '';
  var then = window.performance.now();

  suffixIndexedDB.search(value).then(function(result) {
    var now = window.performance.now();
    console.log('Perf: ', now - then);

    Object.keys(result).forEach(function(aResult) {
      var li = document.createElement('li');
      var span = document.createElement('span');
      li.appendChild(span);

      var matches = result[aResult].matches;
      var innerHTML = '';

      var nextEnd = 0;
      for(var j = 0; j < matches.length; j++) {
        var aMatch = matches[j];

        var firstSubstr = aResult.substring(nextEnd, aMatch.start);

        innerHTML += firstSubstr + '<em>';
        var midSubstr = aResult.substring(aMatch.start, aMatch.end + 1);
        innerHTML += (midSubstr + '</em>');

        if (matches[j + 1]) {
          nextEnd = matches[j + 1].start;
        }
        else {
          nextEnd = aResult.length;
        }
        innerHTML += aResult.substring(aMatch.end + 1, nextEnd);
        span.innerHTML = innerHTML;
      }

      list.appendChild(li);
    });
  });
});

document.getElementById('search-term2').addEventListener('input', function(e) {
  var value = e.target.value;

  list.innerHTML = '';
  var then = window.performance.now();

  suffixIndex.search(value).then(function(result) {
    var now = window.performance.now();
    console.log('Perf: ', now - then);
    console.log('Num Results: ',  Object.keys(result).length);

    Object.keys(result).forEach(function(aResult) {
      var li = document.createElement('li');
      var span = document.createElement('span');
      li.appendChild(span);

      var firstSubstr = aResult.substring(0, result[aResult].matches[0].start);
      var innerHTML = '';
      innerHTML = firstSubstr + '<em>';
      var midSubstr = aResult.substring(result[aResult].matches[0].start,
                                     result[aResult].matches[0].end + 1);
      innerHTML += (midSubstr + '</em>');
      innerHTML += aResult.substring(result[aResult].matches[0].end + 1);
      span.innerHTML = innerHTML;

      list.appendChild(li);
    });
  });
});

function insertContacts(aContacts) {
  var cs = new ContactsSaver(aContacts);
  cs.start();

  cs.onsuccess = function() {
    alert('Contacts loaded');
    document.getElementById('status').textContent = '';
  };

  cs.onsaved = function() {
    console.log('Contact saved');
  }
}

function ct_loadContacts() {
  var req = new XMLHttpRequest();
  req.overrideMimeType('application/json');
  req.open('GET', 'data/fakecontacts.json', true);
  req.onreadystatechange = function() {
    // We will get a 0 status if the app is in app://
    if (req.readyState === 4 && (req.status === 200 ||
                                 req.status === 0)) {
      var contacts = JSON.parse(req.responseText);
      insertContacts(contacts);
    }
  };
  req.onreadystatechange = req.onreadystatechange.bind(this);
  req.send(null);
}
