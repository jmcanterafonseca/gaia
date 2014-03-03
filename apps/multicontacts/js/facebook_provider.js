var MozContactsProvider = {
  get: function(id) {
    return new window.Promise(function(accept, reject) {
      var req = navigator.mozContacts.find({
        filterBy: ['id'],
        filterValue: id,
        filterOp: 'equals'
      });

      req.onsuccess = function() {
        accept(req.result);
      }

      req.onerror = function() {
        reject(req.error);
      }
    });
  },

  save: function(contact) {
    return new window.Promise(function(accept, reject) {
      var req = navigator.mozContacts.save(contact);

      req.onsuccess = function() {
        accept();
      }

      req.onerror = function() {
        reject(req.error);
      }
    });
  },

  remove: function(contact) {

  }
}
