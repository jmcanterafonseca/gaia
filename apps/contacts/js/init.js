var contacts = window.Contacts || {};

if(typeof contacts.init === 'undefined') {
  (function(document) {
    var i = contacts.init = {};

    var handled = false;
    window.currentActivity = null;

    if(navigator.mozSetMessageHandler) {
      navigator.mozSetMessageHandler('activity',activityHandler);
    }

    window.setTimeout(function() { i.start() },0);

    i.start = function() {
      if(handled === false) {
        if(typeof window.localStorage.has_had_something === 'undefined') {
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
      handled = true;
    } // activityHandler
  })(document);
}
