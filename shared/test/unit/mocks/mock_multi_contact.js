'use strict';

var MockMultiContact = {
  _data: Object.create(null),
  
  getData: function(entries) {
    return new Promise(function(resolve, reject) {
      console.log('Entry for multicontact: ', JSON.stringify(entries));
      var id = entries[0].entryData[0].uid;
      console.log('Id multicontact: ', id,
                  JSON.stringify(MockMultiContact._data[id]));
      
      resolve(MockMultiContact._data[id]);
    });
  }
};