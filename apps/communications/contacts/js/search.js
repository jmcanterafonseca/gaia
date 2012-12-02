'use strict';

var contacts = window.contacts || {};

contacts.Search = (function() {
  var favoriteGroup,
      inSearchMode = false,
      conctactsListView,
      list,
      searchBox,
      searchNoResult,
      contactNodes = null,
      contactNodesAndText = null,
      searchableNodes,
      prevTextToSearch = '',
      CHUNK_SIZE = 10;

  var init = function load(_conctactsListView, _groupFavorites) {
    conctactsListView = _conctactsListView;
    favoriteGroup = _groupFavorites;
    searchBox = document.getElementById('search-contact');
    searchNoResult = document.getElementById('no-result');
    list = document.getElementById('groups-list');
  }

  //Search mode instructions
  var exitSearchMode = function exitSearchMode(evt) {
    evt.preventDefault();
    searchNoResult.classList.add('hide');
    conctactsListView.classList.remove('searching');
    searchBox.value = '';
    inSearchMode = false;
    // Show elements that were hidden for the search
    if (favoriteGroup) {
      favoriteGroup.classList.remove('hide');
    }

    // Bring back to visibilitiy the contacts
    var allContacts = getContactsDom();
    resetContactGroup(allContacts,0);

    // Resetting state
    contactNodes = null;
    contactNodesAndText = null;
    prevTextToSearch = '';
    searchableNodes = null;

    return false;
  };

  function resetContactGroup(nodes,from) {
    for(var i = from; i < from + CHUNK_SIZE && i < nodes.length; i++) {
      nodes[i].classList.remove('search');
      nodes[i].classList.remove('hide');
    }

    if(i < nodes.length) {
      window.setTimeout(function() {
        resetContactGroup(nodes, from + CHUNK_SIZE);
      },0);
    }
  }

  var enterSearchMode = function searchMode() {
    if (!inSearchMode) {
      conctactsListView.classList.add('searching');
      cleanContactsList();
      inSearchMode = true;
    }
    return false;
  };

  var search = function performSearch() {
    var textToSearch = normalizeText(searchBox.value.trim());
    var pattern = new RegExp(textToSearch, 'i');
    var count = 0;

    var contactsToSearch = getContactsToSearch(textToSearch,prevTextToSearch);
    searchableNodes = [];
    var firstTime = false;
    if(!contactNodesAndText) {
      contactNodesAndText = [];
      firstTime = true;
    }
    for (var i = 0; i < contactsToSearch.length; i++) {
      var contact = contactsToSearch[i].node || contactsToSearch[i];
      contact.classList.add('search');
      var text = contactsToSearch[i].text || getSearchText(contactsToSearch[i]);
      // It allows a lazy initialization of the contactNodesAndText array
      // Avoiding to iterate two times over the Contact nodes on the DOM
      if(firstTime === true) {
        contactNodesAndText.push({
          node: contactsToSearch[i],
          text: text
        });
      }
      if (!pattern.test(text)) {
        contact.classList.add('hide');
      } else {
        contact.classList.remove('hide');
        searchableNodes.push({
          node: contact,
          text: text
        });
        count++;
      }
    }

    if (count == 0) {
      searchNoResult.classList.remove('hide');
    } else {
      searchNoResult.classList.add('hide');
      document.dispatchEvent(new CustomEvent('onupdate'));
    }

    prevTextToSearch = textToSearch;
  };

  function getSearchText(contact) {
    var body = contact.querySelector('[data-search]');
    var text = body ? body.dataset['search'] : contact.dataset['search'];

    return text;
  }

  var cleanContactsList = function cleanContactsList() {
    if (favoriteGroup) {
      favoriteGroup.classList.add('hide');
    }
  };

  var getContactsDom = function contactsDom() {
    if(!contactNodes) {
      var itemsSelector = ".contact-item:not([data-uuid='#id#'])," +
                        ".block-item:not([data-uuid='#id#'])";
      contactNodes = list.querySelectorAll(itemsSelector);
    }

    return contactNodes;
  }

  function getContactsNodeAndText() {
    return contactNodesAndText || getContactsDom();
  }

  var getContactsToSearch = function getContactsToSearch(newText, prevText) {
    var out;
    if(newText.length >= prevText.length && prevText.length > 0) {
      // Only those nodes which are not hidden are returned
      out = searchableNodes;
    } else {
      out = getContactsNodeAndText();
    }

    return out;
  }

  // When the cancel button inside the input is clicked
  document.addEventListener('cancelInput', function() {
    search();
  });

  return {
    'init': init,
    'search': search,
    'enterSearchMode': enterSearchMode,
    'exitSearchMode': exitSearchMode
  };
})();
