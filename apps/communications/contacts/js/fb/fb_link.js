'use strict';

var fb = window.fb || {};

if (!fb.link) {
  (function(document) {
    // parameter id for the linking contact
    var link = fb.link = {};
    var UI = link.ui = {};

    link.CID_PARAM = 'contactid';

    // Contact id that the user wants to be linked to
    var contactid;
    // The data of such a contact
    var cdata;

    // Access token
    var access_token;

    // Used to control the number of queries
    var numQueries = 0;

    // The uid of the friend to be linked
    var friendUidToLink;

    // Base query to search for contacts
    var SEARCH_QUERY = ['SELECT uid, name, email from user ',
    ' WHERE uid IN (SELECT uid1 FROM friend WHERE uid2=me() ORDER BY rank) ',
    ' AND (', null, ')', ' ORDER BY name'
    ];

    // Conditions
    var MAIL_COND = ['strpos(email, ' , "'", null, "'", ') >= 0'];
    var CELL_COND = ['strpos(cell, ' , "'", null, "'", ') >= 0'];

    var ALL_QUERY = ['SELECT uid, name, email from user ',
    ' WHERE uid IN (SELECT uid1 FROM friend WHERE uid2=me()) ',
    ' ORDER BY name'];

    var CONTAINS_QUERY = ['SELECT id FROM profile WHERE contains(',
                          "'", null, "'", ')',
                          ' LIMIT ',
                          null
    ];

    var FILTER_SEARCH_INDEX = 3;

    var friendsList;
    var viewButton = document.querySelector('#view-all');
    var mainSection = document.querySelector('#main');

    var currentRecommendation = null;
    var allFriends = null;
    // Enables cancelation
    var currentNetworkRequest = null;
    // State can be proposal or view All
    var state;
    var _ = navigator.mozL10n.get;

    // Builds the first query for finding a contact to be linked to
    function buildQuery(contact) {
      var out;
      var filter = [];

      if (contact.tel && contact.tel.length > 0) {
        contact.tel.forEach(function(tel) {
          CELL_COND[2] = tel.value.trim();
          filter.push(CELL_COND.join(''));
          filter.push(' OR ');
        });
      }

      if (contact.email && contact.email.length > 0) {
        contact.email.forEach(function(email) {
          MAIL_COND[2] = email.value.trim();
          filter.push(MAIL_COND.join(''));
          filter.push(' OR ');
        });
      }

      if(filter.length > 0) {
        filter[filter.length - 1] = null;
        SEARCH_QUERY[FILTER_SEARCH_INDEX] = filter.join('');
        out = SEARCH_QUERY.join('');
      }
      else {
        out = null;
      }

      return out;
    }

    function buildQueryContains(contact) {
      if (contact.name && contact.name.length > 0 &&
                                      contact.name[0].length > 0) {
        CONTAINS_QUERY[2] = contact.name[0].trim().toLowerCase();
        // No more than 10 recommended
        CONTAINS_QUERY[CONTAINS_QUERY.length] = 10;
      }

      SEARCH_QUERY[FILTER_SEARCH_INDEX] = ' uid IN (SELECT id from #query1)';

      var queries = {
        query1: CONTAINS_QUERY.join(''),
        query2: SEARCH_QUERY.join('')
      };

      return JSON.stringify(queries);
    }

    // entry point for obtaining a remote proposal
    link.getRemoteProposal = function(acc_tk, contid) {
      var cid = contid || contactid;

      var req = fb.utils.getContactData(cid);

      req.onsuccess = function() {
        if (req.result) {
          cdata = req.result;
          numQueries = 1;
          currentRecommendation = null;
          var query = buildQuery(cdata);
          if(!query) {
            numQueries++;
            query = buildQueryContains(cdata);
          }
          doGetRemoteProposal(acc_tk, cdata, query);
        }
        else {
          throw ('FB: Contact to be linked not found: ', cid);
        }
      }
      req.onerror = function() {
        throw ('FB: Error while retrieving contact data: ', cid);
      }
    }

    function getRemoteProposalByNames(acc_tk, contact) {
      numQueries++;
      doGetRemoteProposal(acc_tk, cdata, buildQueryContains(contact));
    }

    function getRemoteProposalAll(acc_tk) {
      numQueries++;
      doGetRemoteProposal(acc_tk, null, ALL_QUERY.join(''));
    }

    // Performs all the work to obtain the remote proposal
    function doGetRemoteProposal(acc_tk, contactData, query) {
      /*
        Phone.lookup was analysed but we were not happy about how it worked

        var searchService = 'https://api.facebook.com/method/phonebook.lookup' +
                                                      '?include_non_fb=false';
      var entries = [];
      entries.push(getEntry(contactData));
      var sentries = JSON.stringify(entries);

      */
      state = 'proposal';
      currentNetworkRequest = fb.utils.runQuery(query, {
        success: link.proposalReady,
        error: link.errorHandler,
        timeout: link.timeoutHandler
      }, acc_tk);
    }

    // Invoked when remoteAll is canceled
    function cancelCb(notifyParent) {
      if (currentNetworkRequest) {
        currentNetworkRequest.cancel();
        currentNetworkRequest = null;
      }

      Curtain.hide();

      if (notifyParent) {
        parent.postMessage({
            type: 'abort',
            data: ''
        }, fb.CONTACTS_APP_ORIGIN);
      }
    }

    // Invoked when timeout or error and the user cancels all
    function closeCb() {
      Curtain.hide();
    }

    // Obtains a proposal with all friends
    function getRemoteAll() {
      Curtain.oncancel = cancelCb;
      Curtain.show('wait', 'friends');

      state = 'friends';

      currentNetworkRequest = fb.utils.runQuery(ALL_QUERY.join(''), {
        success: fb.link.friendsReady,
        error: fb.link.errorHandler,
        timeout: fb.link.timeoutHandler
      }, access_token);
    }

    // Obtains a linking proposal to be shown to the user
    link.getProposal = function(cid, acc_tk) {
      link.getRemoteProposal(acc_tk, cid);
    }

    // Executed when the server response is available
    link.proposalReady = function(response) {
      if (typeof response.error !== 'undefined' || !response.data) {
        window.console.error('FB: Error while retrieving link data',
                                  response.error.code, response.error.message);

        if (response.error.code != 190) {
          setCurtainHandlersErrorProposal();
          Curtain.show('error', 'proposal');
        }
        else {
          // access token problem. A new OAuth 2.0 flow has to start
          handleTokenError();
        }

        return;
      }

      var data = response.data;
      window.console.log(JSON.stringify(data));
      // To deal with the multiquery for names
      if(response.data.length === 2 && response.data[1].fql_result_set) {
        data = response.data[1].fql_result_set;
        window.console.log(JSON.stringify(data));
      }

      if (data.length === 0 && numQueries === 1) {
        getRemoteProposalByNames(access_token, cdata);
      } else if (data.length === 0 && numQueries === 2) {
        getRemoteProposalAll(access_token);
      } else {
        currentRecommendation = data;

        data.forEach(function(item) {
          if (!item.email) {
            item.email = '';
          }
        });

        if (numQueries === 3) {
          mainSection.classList.add('no-proposal');
        } else {
          viewButton.textContent = _('viewAll');
          viewButton.onclick = UI.viewAllFriends;
        }

        utils.templates.append('#friends-list', data);
        ImageLoader.reload();

        Curtain.hide(sendReadyEvent);
      }
    }

    function sendReadyEvent() {
      parent.postMessage({
        type: 'ready', data: ''
      }, fb.CONTACTS_APP_ORIGIN);
    }

    function setCurtainHandlersErrorProposal() {
      Curtain.oncancel = function() {
        cancelCb(true);
      }

      Curtain.onretry = function getRemoteProposal() {
        Curtain.oncancel = function() {
          cancelCb(true);
        }
        Curtain.show('wait', state);

        link.getRemoteProposal(access_token, contactid);
      }
    }

    link.baseHandler = function(type) {
      if (state === 'friends') {
        Curtain.onretry = getRemoteAll;
        Curtain.oncancel = Curtain.hide;
      } else if (state === 'proposal') {
        setCurtainHandlersErrorProposal();
      }
      else if (state === 'linking') {
        Curtain.onretry = function retry_link() {
          Curtain.show('message', 'linking');
          UI.selected({
            target: {
              dataset: {
                uuid: friendUidToLink
              }
            }
          });
        }
        Curtain.oncancel = Curtain.hide;
      }

      Curtain.show(type, state);
    }

    link.timeoutHandler = function() {
      link.baseHandler('timeout');
    }

    link.errorHandler = function() {
      link.baseHandler('error');
    }

    /**
     *   Clears the list of contacts
     *
     */
    function clearList() {
      if (!friendsList) {
        friendsList = document.querySelector('#friends-list');
      }
      var template = friendsList.querySelector('[data-template]');

      friendsList.innerHTML = '';
      friendsList.appendChild(template);
    }

    link.friendsReady = function(response) {
      if (typeof response.error === 'undefined' && response.data) {
        viewButton.textContent = _('viewRecommend');
        viewButton.onclick = UI.viewRecommended;

        allFriends = response;

        fb.utils.setCachedNumFriends(response.data.length);

        response.data.forEach(function(item) {
            if (!item.email) {
              item.email = '';
            }
        });

        clearList();

        utils.templates.append(friendsList, response.data);
        ImageLoader.reload();

        Curtain.hide();
      }
      else {
        window.console.error('FB: Error while retrieving friends',
                              response.error.code, response.error.message);

        if (response.error.code !== 190) {
          Curtain.onretry = getRemoteAll;
          Curtain.oncancel = Curtain.hide;
        }
        else {
          // Error with the access token. It is very unlikely that this happens
          Curtain.onretry = handleTokenError;
        }
        Curtain.show('error', 'friends');
      }
    }

    function setCurtainHandlers() {
      Curtain.oncancel = function curtain_cancel() {
        cancelCb(true);
      };
    }

    link.start = function(contactId, acc_tk) {
      access_token = acc_tk;
      contactid = contactId;

      setCurtainHandlers();
      clearList();
      ImageLoader.init('#mainContent', "li:not([data-uuid='#uid#'])");

      if (!acc_tk) {
        fb.oauth.getAccessToken(function proposal_new_token(new_acc_tk) {
          access_token = new_acc_tk;
          link.getProposal(contactId, new_acc_tk);
        }, 'proposal');
      }
      else {
        link.getProposal(contactId, acc_tk);
      }
    }

    function retryOnErrorCb() {
      UI.selected({
        target: {
          dataset: {
            uuid: friendUidToLink
          }
        }
      });
    }

    function handleTokenError() {
      Curtain.hide();
      var cb = function() {
        allFriends = null;
        link.start(contactid);
      }
      window.asyncStorage.removeItem(fb.utils.TOKEN_DATA_KEY, cb);
    }

    UI.selected = function(event) {
      Curtain.show('message', 'linking');

      var element = event.target;
      friendUidToLink = element.dataset.uuid;

      // First it is needed to check whether is an already imported friend
      var req = fb.contacts.get(friendUidToLink);
      req.onsuccess = function() {
        if (req.result) {
          window.setTimeout(function delay() {
            Curtain.hide(function hide() {
              notifyParent({
                uid: friendUidToLink
              });
            });
          }, 1000);
        }
        else {
          state = 'linking';
          var importReq = fb.importer.importFriend(friendUidToLink,
                                                   access_token);

          importReq.onsuccess = function() {
            Curtain.hide(function() {
              notifyParent(importReq.result);
            });
          }

          importReq.onerror = function(e) {
            var error = e.target.error;
            window.console.error('FB: Error while importing friend data ',
                                 JSON.stringify(error));
            Curtain.oncancel = Curtain.hide;
            if (error.code != 190) {
              Curtain.onretry = retryOnErrorCb;
            }
            else {
              Curtain.onretry = handleTokenError;
            }
            Curtain.show('error', 'linking');
          }

          importReq.ontimeout = function() {
            link.baseHandler('timeout');
          }
        }
      }

      req.onerror = function() {
        window.console.error('FB: Error while importing friend data');
        Curtain.oncancel = Curtain.hide;
        Curtain.onretry = retryOnErrorCb;
        Curtain.show('error', 'linking');
      }
    }


    UI.end = function(event) {
      var msg = {
        type: 'window_close',
        data: ''
      };

      parent.postMessage(msg, fb.CONTACTS_APP_ORIGIN);
    }

    function notifyParent(data) {
      var msg = {
        type: 'item_selected',
        data: data
      };

      parent.postMessage(msg, fb.CONTACTS_APP_ORIGIN);

      // Uncomment this to make this work in B2G-Desktop
      // parent.postMessage(msg, '*');
    }

    UI.viewAllFriends = function(event) {
      if (!allFriends) {
        getRemoteAll();
      }
      else {
        link.friendsReady(allFriends);
      }

      return false;
    }

    UI.viewRecommended = function(event) {
      // event.target === viewButton
      event.target.onclick = UI.viewAllFriends;
      event.target.textContent = _('viewAll');

      clearList();
      utils.templates.append(friendsList, currentRecommendation);
      ImageLoader.reload();
    }

  })(document);
}
