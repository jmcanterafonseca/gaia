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
      searchableNodes = null,
      currentTextToSearch = '',
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
    window.setTimeout(function exit_search() {
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
      resetContactGroup(allContacts, 0);

      // Resetting state
      contactNodes = null;
      prevTextToSearch = '';
      currentTextToSearch = '';
      searchableNodes = null;
    },0);

    return false;
  };

  function resetContactGroup(nodes,from) {
    for (var i = from; i < from + CHUNK_SIZE && i < nodes.length; i++) {
      var node = nodes[i];
      node.classList.remove('search');
      node.classList.remove('hide');
    }

    if (i < nodes.length) {
      window.setTimeout(function reset_contact_group() {
        resetContactGroup(nodes, from + CHUNK_SIZE);
      },0);
    }
  }

  var enterSearchMode = function searchMode() {
    window.setTimeout(function enter_search() {
      if (!inSearchMode) {
        inSearchMode = true;
        conctactsListView.classList.add('searching');
        cleanContactsList();
      }
    }, 0);
    return false;
  };

  function doSearch(contacts, from, searchText, pattern, state) {
    var end = from + CHUNK_SIZE;
    for(var c = from; c < end && c < contacts.length; c++) {
      var contact = contacts[c].node || contacts[c];
      contact.classList.add('search');
      var contactText = contacts[c].text || getSearchText(contacts[c]);

      if (!pattern.test(contactText)) {
        contact.classList.add('hide');
        window.console.log('Adding classlist hide for contact: ', contact.dataset.uuid, currentTextToSearch);
      } else {
        if(state.count === 0) {
          conctactsListView.classList.add('nonemptysearch');
          searchNoResult.classList.add('hide');
        }
        document.querySelector('#search-list').appendChild(contact);
        // contact.classList.remove('hide');
        state.searchables.push({
          node: contact,
          text: contactText
        });
        state.count++;
      }
    }

    if(c < contacts.length && currentTextToSearch === searchText) {
      window.setTimeout(function do_search() {
        doSearch(contacts, from + CHUNK_SIZE, searchText,
                 pattern, state);
      }, 0);
    } else if(c >= contacts.length) {
      if (state.count === 0) {
        searchNoResult.classList.remove('hide');
        searchableNodes = null;
      } else {
        // Being more responsive by only loading the imgs after a certain delay
        document.dispatchEvent(new CustomEvent('onupdate'));
        searchableNodes = state.searchables;
      }
    } else {
      window.console.log('!!!! Cancelling current search !!!');
    }
  }

  var search = function performSearch() {
    prevTextToSearch = currentTextToSearch;

    currentTextToSearch = normalizeText(searchBox.value.trim());
    var pattern = new RegExp(currentTextToSearch, 'i');

    var contactsToSearch = getContactsToSearch(currentTextToSearch,
                                               prevTextToSearch);
    var state = {
      count: 0,
      searchables: []
    }
    doSearch(contactsToSearch, 0, currentTextToSearch, pattern, state);
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
    if (!contactNodes) {
      var itemsSelector = ".contact-item:not([data-uuid='#id#'])," +
                        ".block-item:not([data-uuid='#id#'])";
      contactNodes = list.querySelectorAll(itemsSelector);
    }

    return contactNodes;
  }

  var getContactsToSearch = function getContactsToSearch(newText, prevText) {
    var out;
    if (newText.length === (prevText.length + 1) &&
        prevText.length > 0 && newText.startsWith(prevText)) {
      // Only those nodes which are not hidden are returned
      window.console.log('**** Reusing searchables ****');
      out = searchableNodes || getContactsDom();
    } else {
      searchableNodes = null;
      out = getContactsDom();
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
