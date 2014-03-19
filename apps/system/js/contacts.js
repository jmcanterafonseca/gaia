/*jshint -W053 */
'use strict';

// Subscribe to changes in contacts datastores
// that the master contacts one, and send notifications
// to Contacts app to update it's data.
var ContactsProvider = (function ContactsProvider() {

  var stores;
  var changesToNotify = {};
  var isMultipleChange = false;

  var init = function init() {
    if (!navigator.getDataStores) {
      return;
    }

    navigator.getDataStores('contacts').then(function(sts) {
      stores = sts;
      // TODO: filter any DS from contacts (be careful with FB DS)
      stores.forEach(function onStore(store) {
        console.log('Registering for listening to changes on ', store.owner);
        store.onchange = onStoreChange.bind(store);
      });
    });
  };

  // If a DS changed, tell Contacts App using IAC to perform the
  // updating process.
  // TODO: Known bug, this event is triggere as many times as
  // DS for contacts we have.
  function onStoreChange(evt) {
    console.log('------------------ DS CHANGE ----------------');
    var owner = null;
    /* jshint ignore:start */
    owner = this.owner;
    console.log('owner: ',  owner);
    /* jshint ignore:end */
    console.log('revision: ', evt.revisionId);
    console.log('id: ', evt.id);
    console.log('operation: ', evt.operation);

    //Do a bit of throlling
    var revision = new String(evt.revisionId);
    changesToNotify[owner] = revision;
    console.log(JSON.stringify(changesToNotify));
    function waitAndCheck() {
      setTimeout(function() {
        if (changesToNotify[owner] !== revision) {
          isMultipleChange = true;
          waitAndCheck();
          return;
        }

        notifyChange(owner, evt);
      }, 1500);
    }
    waitAndCheck();
  }

  function notifyChange(owner, change) {
    console.log('Notifying change to ', owner);

    navigator.mozApps.getSelf().onsuccess = function(evt) {
      var app = evt.target.result;
      app.connect('contacts-sync').then(function onConnAccepted(ports) {
        ports.forEach(function(port) {
          var message = {
            owner: owner,
            multiple: isMultipleChange,
            revisionId: change.revisionId,
            id: change.id,
            operation: change.operation,
            isMultipleChange: false
          };
          port.postMessage(message);
        });
      }, function onConnRejected(reason) {
        console.log('Cannot notify Contacts for change ',
                    JSON.stringify(change));
        console.log(reason);
      });
    };
  }

  return {
    init: init
  };

})();

ContactsProvider.init();
