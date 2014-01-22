'use strict';

// This object implements a prefix tree (aka trie) for FB tel numbers
// TODO: Implement the Compact version of this tree (aka patricia tree)

function Node(number) {
  this.keys = [];
  this.leaves = null;
  this.value = number;
}

var TelIndexer = {
  _MIN_TEL_LENGTH: 3,

  _indexOf: function(array, value) {
    var out = -1;

    if (!Array.isArray(array)) {
      return out;
    }

    for (var j = 0, l = array.length; j < l; j++) {
      if (array[j].value === value) {
        out = j;
        break;
      }
    }
    return out;
  },

  // Allows to index the number passed as parameter
  index: function(tree, number, dsId) {
    // For each length starting from the minimum (3)
    for (var k = this._MIN_TEL_LENGTH; k <= number.length; k++) {
      // For each number
      var str;
      for (var j = 0; j < number.length - 1; j++) {
        str = '';
        if (j + k <= number.length) {
          for (var h = j; h < (j + k); h++) {
            str += number.charAt(h);
          }
          this.insert(tree, str, dsId);
        }
      }
    }
  },

  // Inserts a number on the tree
  insert: function(tree, str, dsId) {
    var totalLength = str.length;

    var firstThreeStr = str.substring(0, this._MIN_TEL_LENGTH);

    var rootObj = tree[firstThreeStr];
    if (!rootObj) {
      rootObj = tree[firstThreeStr] = new Node(firstThreeStr);
      rootObj.keys.push(dsId);
    }

    var currentObj = rootObj, nextObj;
    for (var j = this._MIN_TEL_LENGTH; j < totalLength; j++) {
      var inextObj = this._indexOf(currentObj.leaves, str.charAt(j));
      if (inextObj === -1) {
        nextObj = new Node(str.charAt(j));
        nextObj.keys.push(dsId);
        currentObj.leaves = currentObj.leaves || [];
        currentObj.leaves.push(nextObj);
      }
      else {
        nextObj = currentObj.leaves[inextObj];
      }
      currentObj = nextObj;
    }
  },

  // Search for a number (which can be partial) on the tree
  search: function(tree, number) {
    var out = [];
    var totalLength = number.length;
    var MIN_TEL_LENGTH = this._MIN_TEL_LENGTH;

    if (totalLength >= MIN_TEL_LENGTH) {
      var firstThreeStr = number.substring(0, MIN_TEL_LENGTH);
      var rootObj = tree[firstThreeStr];
      var currentObj, nextObj;
      if (rootObj && totalLength > MIN_TEL_LENGTH) {
        currentObj = rootObj;
        for (var j = MIN_TEL_LENGTH; j < totalLength; j++) {
          var inextObj = this._indexOf(currentObj.leaves, number.charAt(j));
          if (inextObj === -1) {
            currentObj = null;
            break;
          }
          currentObj = currentObj.leaves[inextObj];
        }
        if (currentObj !== null) {
          out = currentObj.keys;
        }
      }
      else if (rootObj) {
        out = rootObj.keys;
      }
    }

    return out;
  },

  // Removes a number from the tree
  // TODO: Compact the tree when a number is removed
  remove: function(tree, number, dsId) {
    var totalLength = number.length;
    var firstThreeStr = number.substring(0, this._MIN_TEL_LENGTH);

    var rootObj = tree[firstThreeStr];
    if (rootObj) {
      var index = rootObj.keys.indexOf(dsId);
      if (index !== -1) {
        rootObj.keys.splice(index, 1);
      }

      var currentObj = rootObj, nextObj;
      for (var j = this._MIN_TEL_LENGTH; j < totalLength; j++) {
        var inextObj = this._indexOf(currentObj.leaves, number.charAt(j));
        if (inextObj === -1) {
          break;
        }
        nextObj = currentObj.leaves[inextObj];
        var keyIndex = nextObj.keys.indexOf(dsId);
        nextObj.keys.splice(keyIndex, 1);
        currentObj = nextObj;
      }
    }
  }
};
