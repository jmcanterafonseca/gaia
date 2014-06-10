'use strict';

require('/shared/js/contacts/multi_contact.js');
require('/shared/test/unit/mocks/mock_navigator_datastore.js');


suite('Getting MultiContact Data', function() {
  
  var datastore1, datastore2;
  
  var EXAMPLE1_APP = 'app://example.a1.org';
  var EXAMPLE2_APP = 'app://example.a2.org';
  
  var CONTACTS_APP = 'app://communications.gaiamobile.org';
  
  var globalEntryId = '9876';
  var ds1Id = '1234', ds2Id = '4567';
  
  // Global entry on the GCDS references two different datastores
  var entry = {
    id: globalEntryId,
    entryData: [
      {
        origin: EXAMPLE1_APP,
        uid: ds1Id
      },
      {
        origin: EXAMPLE2_APP,
        uid: ds2Id
      }
    ]
  };
  
  var entryMozContacts = {
    id: '9876',
    entryData: [
      {
        origin: CONTACTS_APP,
        uid: ''
      }
    ]
  };
  
  var ds1Records = Object.create(null);
  ds1Records[ds1Id] = {
    givenName: ['Jose'],
    tel: [
      {
        type: ['work'],
        value: '983367741'
      }
    ]
  };
  
  var ds2Records = Object.create(null);
  ds2Records[ds2Id] = {
    lastName: ['Cantera'],
    email: [
      {
        type: ['personal'],
        value: 'jj@jj.com'
      }
    ]
  };
  
  suiteSetup(function() {
    datastore1 = new MockDatastore('contacts', EXAMPLE1_APP, ds1Records);
    datastore2 = new MockDatastore('contacts', EXAMPLE2_APP, ds2Records);
    
    MockNavigatorDatastore._datastores = [
      datastore1,
      datastore2
    ];
    navigator.getDataStores = MockNavigatorDatastore.getDataStores;
  });
  
  suiteTeardown(function() {
    
  });
  
  test('Getting data from two different datastores', function(done) {
    MultiContact.getData(entry).then(function success(data) {
      assert.equal(data.id, globalEntryId);
      
      assert.equal(data.lastName[0], 'Cantera');
      assert.equal(data.givenName[0], 'Jose');
      assert.equal(data.tel.length, 1);
      assert.equal(data.email.length, 1);
      
      done();
    }, function error(err) {
        alert('error');
    });
  });
  
  test('Getting data from two different datastores and mozContacts',
    function(done) {
      done();
  });
});