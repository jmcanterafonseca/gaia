var datastore;
// Fields to index
var fields = [
  'givenName',
  'familyName',
  'org'
];

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


document.getElementById('bt_persist').onclick = function() {
  console.log('Persisting ...');

  var theIndex = {
    wordIndex: wordIndex,
    suffixHash: suffixHash,
    suffixesArray: suffixesArray
  };

  var storage = navigator.getDeviceStorage('sdcard');
  var blobContent =  [JSON.stringify(theIndex)];
  storage.add(new Blob(blobContent, {type: 'application/json'}));

  datastore.put(theIndex, 1);
}

document.getElementById('bt_load').onclick = function() {
  document.getElementById('status').textContent = 'Loading ...';
  ct_loadContacts();
}

document.getElementById('bt_loadindex').onclick = function() {
  document.getElementById('status').textContent = 'Loading ...';
  datastore.get(1).then(function(obj) {
    suffixIndex.setIndexData(obj);
  });
}

var list = document.getElementById('search-result');

document.getElementById('search-term').addEventListener('input', function(e) {
  var value = e.target.value;

  list.innerHTML = '';
  var then = window.performance.now();

  suffixIndex.search(value).then(function(result) {
    var now = window.performance.now();
    console.log('Perf: ', now - then);

    Object.keys(result).forEach(function(aResult) {
      var li = document.createElement('li');
      var span = document.createElement('span');
      li.appendChild(span);

      var firstSubstr = aResult.substring(0, result[aResult].start);
      var innerHTML = '';
      innerHTML = firstSubstr + '<em>';
      var midSubstr = aResult.substring(result[aResult].start,
                                     result[aResult].end + 1);
      innerHTML += (midSubstr + '</em>');
      innerHTML += aResult.substring(result[aResult].end + 1);
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
