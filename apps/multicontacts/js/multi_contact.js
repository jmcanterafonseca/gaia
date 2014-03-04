/*

  sourceData is an object like this: {
    sources: [
      store: 'mozContacts'
      uuid: <id>
    ]
  }

 */

'use strict';

function MultiContact(sourceData) {
  this._sourceData = sourceData;

  // Sources are ordered
  this._orderSources();

  this._providers = {
    'mozContacts': MozContactsProvider,
    'facebook': FacebookProvider,
    'datastore': DataStoreProvider
  }
}

MultiContact.prototype = {
  save: function() {
    if (!this._sourceData) {
      throw new Exception('Data not provided');
    }
    return MultiContacts.save(multiContactData);
  },

  // Returns all the data of this multicontact
  getData: function() {
    if (!this._multiContactData) {
      throw new Exception('Multicontact metadata not available');
    }
    return new window.Promise(function(accept, reject) {
      var sourceRawData = this._sourceRawData;
      var totalData = sourceRawData.length;
      // Contains the data items as per the different sources
      var dataItems =Object.create(null);

      function dataReady(source, contactData) {
        totalData--;
        dataItems[source] = contactData;
        if (totalData === 0) {
          // Data has to be merged
          var master = this._sourceOrders[0];
          var slaves = [];
          for(var j = 1; j < this._sourceOrders[j]; j++) {
            slaves.push(dataItems)
          }
          var out = this._merge(master, slaves);
          accept(out);
        }
      }

      // Iterating over the providers and getting the data

      sourceRawData.forEach(function(aSource) {
        var provider = this._providers[aSource.store];

        // TODO: Deal with errors
        provider.get(aSource.id).then(dataReady.bind(null, aSource.store));
      });
    })
  },

  // Merge the data of the multicontact according to the merge rules
  _merge: function(masterContact, auxContacts) {
    // For the moment the masterContact is returned
    return masterContact;
  },

  // Obtains the primary data of the multicontact
  // The data that will appear on the contact list
  _getPrimaryData: function() {
    var out = {
      givenName: '',
      familyName: '',
      org: '',
      photo: null
    };

    var sourceRawData = this._sourceRawData;
    var numDataFilled = 0;
    var keysToBeFilled = Object.keys(out);
    var totalDataToBeFilled = keysToBeFilled.length;
    for(var j = 0; j < sourceRawData.length &&
        numDataFilled < totalDataToBeFilled; j++) {
      for(var i = 0; i < totalDataToBeFilled; i++) {
        var key = keysToBeFilled[i];
        var value = sourceRawData[j].data[key];
        if (value) {
          out[key] = value;
          numDataFilled++;
        }
      }
    }

    return out;
  },

  // The order right now is that mozContacts is the first
  // In the future we could assign an specific order
  _orderSources: function() {
    this._sourceRawData.sort(function(a, b) {
      if (a.source === 'mozContacts') {
        return 1;
      }
      return 0;
    });

    this._sourceOrder = [];
    // The _sourceOrder array is created to keep conveniently
    // the source order
    this._sourceRawData.forEach(function(aSource) {
      this._sourceOrder.push(aSource.source);
    });
  }
}
