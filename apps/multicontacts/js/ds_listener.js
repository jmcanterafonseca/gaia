var DatastoreListener = (function() {
  function init() {
    navigator.mozContacts.addEventListener('contactchanged', function(e) {
      GlobalDataStore.save({
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
