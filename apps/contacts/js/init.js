var Contacts = window.Contacts || {};

function activityFinished(name) {
  Contacts.init.onActivityFinished(name);
}

if(typeof Contacts.init === 'undefined') {
  (function(document) {
    var i = Contacts.init = {};

    window.currentActivity = null;

    window.setTimeout(function() { i.start() },0);

    i.start = function() {
      if (navigator.mozHasPendingMessage &&
                              !navigator.mozHasPendingMessage('activity')) {
        if (typeof window.localStorage.has_had_something === 'undefined') {
          var req = navigator.mozContacts.find({});
          req.onsuccess = function(e) {
            if(e.target.result.length > 0) {
              window.localStorage.has_had_something = 'has_had_something';
              contactsHome();
            }
            else {
              importScr();
            }
          }
        }
        else {
          contactsHome();
        }
      }

      if (navigator.mozSetMessageHandler) {
        navigator.mozSetMessageHandler('activity',activityHandler);
      }
    }

    i.onActivityFinished = function(name) {
      contactsHome();
    }

    function contactsHome() {
      document.querySelector('#contacts').src = 'contacts.html';
      document.body.dataset.state = 'contacts';
    }

    function importScr() {
      document.querySelector('#import').src = 'import.html';
      document.body.dataset.state = 'import';
    }

    function importFB() {
      window.console.log('Import FB!!!');
      document.querySelector('#importFB').src = 'fb_import.html';
      document.body.dataset.state = 'importFB';
    }

    function activityHandler(activity) {
      window.currentActivity = activity;
      var aname = activity.source.name;

      window.console.log('Activity: ',aname);

      if(aname === 'import') {
        importScr();
      }
      else if(aname === 'importFB') {
        importFB();
      }
      else {
        contactsHome();
      }
    } // activityHandler
  })(document);
}
