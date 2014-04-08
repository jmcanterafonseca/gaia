'use strict';

var App = function App() {

  var store = null;
  var info = null;
  var fillButton, resetButton;

  var DS_NAME = 'contacts';

  var init = function init() {
    info = document.getElementById('info');
    fillButton = document.getElementById('fillDS');
    resetButton = document.getElementById('resetDS');

    fillButton.addEventListener('click', handleEvent);
    resetButton.addEventListener('click', handleEvent);

    initDS();
  };

  function notifyContactsManager() {
    navigator.mozApps.getSelf().onsuccess = function(evt) {
      var app = evt.target.result;
      app.connect('contacts-sync').then(function onConnAccepted(ports) {
        ports.forEach(function(port) {
          var message = {
            owner: store.owner,
            revisionId: store.revisionId
          };
          port.postMessage(message);
        });
      }, function onConnRejected(reason) {
          console.log('Cannot notify Contacts Manager: ', reason);
      });
    };
  }

  function handleEvent(evt) {
    var btn = evt.target.id;

    switch (btn) {
      case 'fillDS':
      fillButton.disabled = true;
      LinkedIn.initLogin(store, function() {
        LinkedIn.importContacts(function() {
          store.getLength().then(function(count) {
            info.textContent = count + ' elements';
          });
          fillButton.disabled = false;
          notifyContactsManager();
        });
      });
      break;
      case 'resetDS':
      store.clear().then(function() {
        store.getLength().then(function(count) {
          info.textContent = count + ' elements';
          notifyContactsManager();
        });
      });
      break;
      default:
      break;
    }
  }

  function initDS() {
    function storeError() {
      info.textContent = 'Error getting store';
    }

    if (!navigator.getDataStores) {
      info.textContent = 'NO DataStore API!';
      return;
    }

    navigator.getDataStores(DS_NAME).then(function(ds) {
      if (!ds || ds.length < 1) {
        storeError();
        return;
      }
      ds.forEach(function onDs(datastore) {
        if (datastore.owner.indexOf('provider2')) {
          store = datastore;
          console.log('Got store ' + store.owner);
        }
      });

      store.getLength().then(function(count) {
        info.textContent = count + ' elements';
      });
    }, function() {
      storeError();
    });
  }

  return {
    init: init
  };

}();

App.init();
