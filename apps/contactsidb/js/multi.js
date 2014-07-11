var data = {
  givenName: ['Jose'],
  familyName: ['Cantera'],
  name: ['Jose Cantera'],
  tel: [
    {
      type: ['work'],
      value: '638883076'
    },
    {
      type: ['home'],
      value: '983456789'
    }
  ],
  email: [
    {
      type: ['work'],
      value: 'jj@jj.com'
    },
    {
      type: ['home'],
      value: 'jj@gmail.com'
    }
  ],
  bday: new Date(0),
  category: ['category']
};


var originStore = {
  owner: 'app://contactsidb.gaiamobile.org/manifest.webapp'
};

var originMozContacts = {
  owner: 'app://communications.gaiamobile.org'
};

function addToDS() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'data/firefoxOS.png');
  xhr.responseType = 'blob';

  xhr.onload = function() {
    data.photo = [xhr.response];
    
    var req = navigator.mozContacts.save(new mozContact(data));

    req.onsuccess = function() {
      console.log('Successfully added to mozContacts');
      var reqFind = navigator.mozContacts.find({});

      reqFind.onsuccess = function() {
        var contact = reqFind.result[0];
        var id = contact.id;
        console.log('Id: ', id);

        GlobalContacts.add(originMozContacts, id, data).then(function(id) {
          console.log('MozContacts entry added to the GCDS', id);
          return GlobalContacts.add(originStore, 'abc98765', data);
        }).then(function() {
            console.log('Entries added to the GCDS');
            navigator.getDataStores('contacts').then(function(list) {
              return list[0].put(data, 'abc98765');
            }).then(function() {
                console.log('Added contact to the provider DS');
            }, function(err) {
                console.error('Error: ', err.name);
            }).catch(function error(err) {
                console.error('Error: ', err.name);
            });
        }).catch(function(err) {
            console.error('Error: ', err.name);
          });
      }
      reqFind.onerror = function() {
        console.error(req.error.name);
      }
    }

    req.onerror = function(err) {
      console.error('Cannot add to mozContacts', err.name);
    }
  }

  xhr.send();
}

function readMulti() {
  var then = window.performance.now();

  GlobalContacts.get(2).then(function(aEntry) {
    return MultiContact.getData({ id: 2, entryData: aEntry });
  }).then(function(result) {
      var now = window.performance.now();
      console.log('Time to retrieve entry: ', now - then);
  }).catch(function error(err) {
      console.error('Error while reading multi: ', err.name);
  });
}

document.getElementById('addDS').addEventListener('click', addToDS);
document.getElementById('readMulti').addEventListener('click', readMulti);
