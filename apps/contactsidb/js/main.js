var contactData = {
    id: 'abc98765',
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
    category: ['facebook']
  };


// App script goes here.
function addRecords() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'data/firefoxOS.png');
  xhr.responseType = 'blob';

  xhr.onload = function() {
    contactData.photo = [xhr.response];

    var then = window.performance.now();

    ContactsData.save(contactData).then(function success(id) {
      var now = window.performance.now();
      console.log('Time for saving: ', now - then);
      console.log('Data was saved properly with id: ', id);
    }).catch(function(err) {
        console.error('Failed: ', err.name);
    });
  }

  xhr.send();
}

function readRecords() {
  var then = window.performance.now();

  ContactsData.get(contactData.id).then(function success(record) {
    now = window.performance.now();
    console.log('Time for reading: ', now - then);
  }).catch(function error(err) {
      console.error(err.name);
  });
}

function loadContacts() {
  var req = new XMLHttpRequest();
  req.overrideMimeType('application/json');
  req.open('GET', '/data/fakecontacts.json', true);
  req.onreadystatechange = function() {
    // We will get a 0 status if the app is in app://
    if (req.readyState === 4 && (req.status === 200 ||
                                 req.status === 0)) {
      var contacts = JSON.parse(req.responseText);
      insertContacts(contacts);
    }
  };

  req.send(null);
}

function insertContacts(aContacts) {
  var cs = new ContactsSaver(aContacts);
  cs.start();

  cs.onsuccess = function() {
    console.log('All contacts saved')
  };
  cs.onsaved = function(n) {
    console.log('Saved!');
  };
  cs.onerror = function(c, e) {
    console.error('Error while saving contact');
  };
}

function getAll() {
  var then = window.performance.now();
  var now = window.performance.now();

  var cursor = ContactsData.getAll();

  cursor.onsuccess = function(e) {
    now = window.performance.now();

    console.log('Time elapsed for getting a record: ', now - then);
    var contact = e.target.result;
    if (contact) {
      then = window.performance.now();
      cursor.continue();
    }
    else {
      console.log('Iteration finished!');
    }
  }

  cursor.onerror = function() {
    console.error('Error!!!');
  }
}

document.getElementById('add').addEventListener('click', addRecords);
document.getElementById('read').addEventListener('click', readRecords);
document.getElementById('workload').addEventListener('click', loadContacts);
document.getElementById('getall').addEventListener('click', getAll);
