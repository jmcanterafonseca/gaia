/* global Google */

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

  function handleEvent(evt) {
    var btn = evt.target.id;

    switch (btn) {
      case 'fillDS':
      fillButton.disabled = true;
      Google.initLogin(store, function(t) {
        Google.importContacts(function() {
          fillButton.disabled = false;
          store.getLength().then(function(count) {
            info.textContent = count + ' elements';
          });
        });
      });
      break;
      case 'resetDS':
      store.clear().then(function() {
        store.getLength().then(function(count) {
          info.textContent = count + ' elements';
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
      store = ds[0];
      console.log('----> Got a DS for ' + store.owner);

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