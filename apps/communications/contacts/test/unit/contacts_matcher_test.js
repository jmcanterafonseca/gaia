require('/shared/js/text_normalizer.js');
requireApp('communications/contacts/test/unit/mock_find_matcher.js');
requireApp('communications/contacts/js/contacts_matcher.js');

var realmozContacts,
    contact;


if (!this.realmozContacts) {
  this.realmozContacts = null;
}

if (!this.contact) {
  this.contact = null;
}

suite('Test Contacts Matcher', function() {

  suiteSetup(function() {
    // Base contact
    contact = {
      id: '1B',
      givenName: ['Carlos'],
      familyName: ['Álvarez'],
      tel: [{
        type: 'home',
        value: '676767671'
      }],
      email: [{
        type: 'personal',
        value: 'jj@jj.com'
      }
      ]
    };

    MockFindMatcher.setResult(contact);

    realmozContacts = navigator.mozContacts;
    navigator.mozContacts = MockFindMatcher;
  });

  suiteTeardown(function() {
    navigator.mozContacts = realmozContacts;
  });

  function assertDefaultMatch(results) {
    assert.equal(Object.keys(results).length, 1);
    assert.equal(Object.keys(results)[0], '1B');
    var matchingContact = results['1B'].matchingContact;
    assert.equal(matchingContact.email[0].value, 'jj@jj.com');
    assert.equal(matchingContact.tel[0].value, '676767671');
  }

  test('Matching by name and phone number', function(done) {
    var myObj = Object.create(contact);
    myObj.id = '1A';
    myObj.email = null;

    var cbs = {
      onmatch: function(results) {
        assertDefaultMatch(results);
        done();
      },
      onmismatch: function() {
        assert.fail(cbs.onmatch, cbs.onmismatch, 'No contacts matches found!!');
        done();
      }
    };

    contacts.Matcher.matchSilentMode(myObj, cbs);
  });

  test('Matching by name and e-mail', function(done) {
    var myObj = Object.create(contact);
    myObj.id = '1A';
    myObj.tel = null;

    var cbs = {
      onmatch: function(results) {
        assertDefaultMatch(results);
        done();
      },
      onmismatch: function() {
        assert.fail(cbs.onmatch, cbs.onmismatch, 'No contacts matches found!!');
        done();
      }
    };

    contacts.Matcher.matchSilentMode(myObj, cbs);
  });

  test('Matching by name e-mail and phone number', function(done) {
    var myObj = Object.create(contact);
    myObj.id = '1A';

    var cbs = {
      onmatch: function(results) {
        assertDefaultMatch(results);
        done();
      },
      onmismatch: function() {
        assert.fail(cbs.onmatch, cbs.onmismatch, 'No contacts matches found!!');
        done();
      }
    };

    contacts.Matcher.matchSilentMode(myObj, cbs);
  });

  test('Phone number matches but name does not match', function() {

  });

  test('e-mail matches but name does not match', function() {

  });

  test('Name matches, e-mail matches but phone number does not match',
       function() {

  });

  test('Name matches phone number matches by e-mail does not match',
       function() {
  });
});
