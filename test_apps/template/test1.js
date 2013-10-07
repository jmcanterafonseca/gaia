var datastore;

function doIt() {
  navigator.getDataStores('MyDataStore').then(function success(ds) {
    alert('here');
    datastore = ds[0];
    var index = {};
    return datastore.add(index);
  }).then(function(id) {
      return datastore.get(id);
  }).then(function(obj) {
      try {
        obj['xxxx'] = 4567;
      }
      catch(e) {
        window.console.error(e);
        alert('failed');
        return;
      }
      alert('passed');
  });
}

function doIt2() {
  navigator.getDataStores('MyDataStore').then(function success(ds) {
    datastore = ds[0];
    var myObj = {
      'prop1': ['hola'],
      'prop2': 'Que tal'
    };
    return datastore.add(myObj);
  }).then(function(id) {
      return datastore.get(id);
  }).then(function(obj) {
      alert(obj.prop2);
  });
}

document.getElementById('bt').addEventListener('click', doIt2);
