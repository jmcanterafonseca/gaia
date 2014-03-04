function MultiContact(sourceRawData, _multiContactData) {
  this._sourceData = sourceData;
  this._multiContactData = multiContactData;
}

MultiContact.prototype = {
  save: function() {
    if (this._multiContactData) {
      return MultiContacts.save(this._multiContactData);
    }

    if(this._sourceRawData)  {
      var orderedSources = this._getOrderedSources();

    }

    throw new Exception('Data not provided');
  },

  getData: function() {

  },

  _merge: function() {

  },

  _getPrimaryData: function(orderedSources) {
    var out = {};

    // First the mozContactData is obtained
  }
}

var DatastoreListener = (function() {
  function init() {
    navigator.mozContacts.addEventListener('contactchange', function(e) {
      MultiContacts.save({
        sources: [
          {
            store: 'mozContacts',
            id:    e.target.id
          }
        ],
        data: {
          givenName: [],
          familyName: [],
          photo: [],
          org: []
        }
      })
    });
  }

  return {
    'init': init
  }
})();

var multiContact = new MultiContact([{
  source: 'mozContacts',
  data: aMozContact
},
{
  source: 'gmail',
  data: aGmailContact
}]);

multiContact.save();


ContactSaver.save();
