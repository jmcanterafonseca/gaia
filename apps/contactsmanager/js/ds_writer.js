var datastore;

navigator.getDataStores('Global_Contacts').then(function(dsList) {
  datastore = dsList[0];

  navigator.mozContacts.oncontactchange = function(event) {
    console.log('Contact change: ', event.reason);
    // Fields to index
    var fields = [
      'givenName',
      'familyName',
      'org'
    ];

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
  console.log(JSON.stringify(suffixesArray));

  datastore.add({
    wordIndex: wordIndex,
    suffixHash: suffixHash,
    suffixesArray: suffixesArray
  });
}

var list = document.getElementById('search-result');

document.getElementById('search-term').addEventListener('input', function(e) {
  var value = e.target.value;

  list.innerHTML = '';
  var then = window.performance.now();

  search(value).then(function(result) {
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
      console.log(midSubstr);
      innerHTML += midSubstr;
      innerHTML += '</em>';
      innerHTML += aResult.substring(result[aResult].end + 1);
      span.innerHTML = innerHTML;
      console.log(innerHTML);
      list.appendChild(li);
    });
  });
});
