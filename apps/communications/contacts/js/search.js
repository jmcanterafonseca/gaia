'use strict';

var contacts = window.contacts || {};

contacts.Search = (function() {
  var favoriteGroup,
      inSearchMode = false,
      conctactsListView,
      list,
      searchBox,
      searchList,
      searchNoResult,
      contactNodes = null,
      // On the steady state holds the list result of the current search
      searchableNodes = null,
      currentTextToSearch = '',
      prevTextToSearch = '',
      // Pointer to the nodes which are currently on the result list
      currentSet = {},
      inScrolling = false,
      mustStopAddReamining = false,
      theClones = {},
      CHUNK_SIZE = 10,
      SEARCH_PAGE_SIZE = 10;

  var init = function load(_conctactsListView, _groupFavorites) {
    conctactsListView = _conctactsListView;
    favoriteGroup = _groupFavorites;
    searchBox = document.getElementById('search-contact');
    searchList = document.querySelector('#search-list');
    searchNoResult = document.getElementById('no-result');
    list = document.getElementById('groups-list');
    searchList.parentNode.addEventListener('scroll', onSearchBlur);
  }

  //Search mode instructions
  var exitSearchMode = function exitSearchMode(evt) {
    evt.preventDefault();
    window.setTimeout(function exit_search() {
      searchNoResult.classList.add('hide');
      conctactsListView.classList.remove('searching');
      conctactsListView.classList.remove('nonemptysearch');
      searchBox.value = '';
      inSearchMode = false;
      // Show elements that were hidden for the search
      if (favoriteGroup) {
        favoriteGroup.classList.remove('hide');
      }

      // Resetting state
      contactNodes = null;

      resetState();
    },0);

    return false;
  };

  function resetState() {
    prevTextToSearch = '';
    currentTextToSearch = '';
    searchableNodes = null;
    currentSet = {};
    theClones = {};
  }

  function addRemainingResults(nodes,from) {
    for (var i = from; i < from + CHUNK_SIZE && i < nodes.length; i++) {
      var node = nodes[i].node;
      var clon = getClone(node);
      theClones[node.dataset.uuid] = clon;
      searchList.appendChild(clon);
    }

    if (i < nodes.length && !mustStopAddReamining) {
      window.setTimeout(function add_remaining() {
        addRemainingResults(nodes, from + CHUNK_SIZE);
      },0);
    }
    else {
      inScrolling = false;
    }
  }

  function onSearchBlur(e) {
    window.console.log('--- Search blur invoked ----');
    inScrolling = true;

    if (conctactsListView.classList.contains('nonemptysearch') &&
        !inScrolling) {
      // All the searchable nodes have to be added
      addRemainingResults(searchableNodes, SEARCH_PAGE_SIZE);
    }
  }

  function getClone(node) {
    var id = node.dataset.uuid;
    var out = theClones[id];

    if (!out) {
      out = node.cloneNode();
      cacheClone(id, out);
    }

    return out;
  }

  function cacheClone(id, clone) {
    theClones[id] = clone;
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
    for (var c = from; c < end && c < contacts.length; c++) {
      var contact = contacts[c].node || contacts[c];
      var contactText = contacts[c].text || getSearchText(contacts[c]);

      if (!pattern.test(contactText)) {
        // contact.classList.add('hide');
        window.console.log('Adding classlist hide for contact: ', contact.dataset.uuid, currentTextToSearch);
        if (contact.dataset.uuid in currentSet) {
          try {
            searchList.removeChild(currentSet[contact.dataset.uuid]);
          }
          catch (e) { }
          delete currentSet[contact.dataset.uuid];
        }
      } else {
        if (state.count === 0) {
          conctactsListView.classList.add('nonemptysearch');
          searchNoResult.classList.add('hide');
        }
        // Only an initial page of elements is loaded in the search list
        if ((state.count + Object.keys(currentSet).length)
           < SEARCH_PAGE_SIZE && !(contact.dataset.uuid in currentSet)) {
          var clonedNode = getClone(contact);
          currentSet[contact.dataset.uuid] = clonedNode;
          searchList.appendChild(clonedNode);
        }
        else {
          window.console.log('#### not adding more ####');
        }
        // contact.classList.remove('hide');
        state.searchables.push({
          node: contact,
          text: contactText
        });
        state.count++;
      }
    }

    if (c < contacts.length && currentTextToSearch === searchText) {
      window.setTimeout(function do_search() {
        doSearch(contacts, from + CHUNK_SIZE, searchText,
                 pattern, state);
      }, 0);
    } else if (c >= contacts.length) {
      if (state.count === 0) {
        searchNoResult.classList.remove('hide');
        searchableNodes = null;
      } else {
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

    if (currentTextToSearch.length === 0) {
      conctactsListView.classList.remove('nonemptysearch');
      resetState();
    }
    else {
      var pattern = new RegExp(currentTextToSearch, 'i');
      var contactsToSearch = getContactsToSearch(currentTextToSearch,
                                               prevTextToSearch);
      var state = {
        count: 0,
        searchables: []
      };
      doSearch(contactsToSearch, 0, currentTextToSearch, pattern, state);
    }
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
                        ".block-item:not([data-uuid='#uid#'])";
      contactNodes = list.querySelectorAll(itemsSelector);
    }

    return contactNodes;
  }

  var getContactsToSearch = function getContactsToSearch(newText, prevText) {
    var out;
    if (newText.length > prevText.length &&
        prevText.length > 0 && newText.startsWith(prevText)) {
      // Only those nodes which are not hidden are returned
      window.console.log('**** Reusing searchables ****');
      out = searchableNodes || getContactsDom();
    } else {
      searchableNodes = null;
      searchList.innerHTML = '';
      currentSet = {};
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
