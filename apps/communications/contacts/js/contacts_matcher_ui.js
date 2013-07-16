var contacts = window.contacts || {};

if (!contacts.MatcherUI) {
  contacts.MatcherUI = (function() {

    var CONTACTS_APP_ORIGIN = 'app://communications.gaiamobile.org';

    // Counter for checked list items
    var checked = 0;

    // Hash contains identifiers of checked contacts
    var checkedContacts = {};

    var mergeButton, contactsList, duplicateMessage;

    function init() {
      mergeButton = document.getElementById('merge-action');
      if (!mergeButton) {
        return;
      }

      duplicateMessage = document.querySelector('#duplicate-msg > p');
      contactsList = document.querySelector('#contacts-list-container > ol');

      document.getElementById('merge-close').addEventListener('click', onClose);
      contactsList.addEventListener('click', onClick);
      mergeButton.addEventListener('click', onMerge);
    }

    function load(contact, results, cb) {
      // This is the message: "Suggested duplicate contacts for xxx"
      duplicateMessage.textContent =
        navigator.mozL10n.get('suggestedDuplicateContacts', {
          name: contact.name ? contact.name[0] : ''
        });

      // Rendering the duplicate contacts list
      renderList(results, cb);
    }

    var listDependencies = ['/contacts/js/utilities/image_loader.js',
                            '/contacts/js/utilities/templates.js'];

    function renderList(contacts, success) {
      LazyLoader.load(listDependencies, function loaded() {
        // For each contact in the list
        Object.keys(contacts).forEach(function(id) {
          // New contact appended
          utils.templates.append(contactsList,
                                 cookContact(contacts[id].matchingContact));
        });

        // The template is deleted from the list
        contactsList.removeChild(contactsList.firstElementChild);
        new ImageLoader('#main', 'li');
        setTimeout(success);
      });
    }

    function cookContact(contact) {
      var out = {};

      populate(contact, out, Object.getOwnPropertyNames(contact));
      populate(contact, out,
                    Object.getOwnPropertyNames(Object.getPrototypeOf(contact)));

      if (Array.isArray(out.email) && out.email[0]) {
        out.email1 = out.email[0].value;
      }

      if (Array.isArray(out.photo) && out.photo[0]) {
        out.photo1 = window.URL.createObjectURL(out.photo[0]);
      }

      return out;
    }

    function populate(source, target, propertyNames) {
      propertyNames.forEach(function(property) {
        var propertyValue = source[property];
        if (propertyValue) {
          target[property] = propertyValue;
        }
      });
    }

    function onClose(e) {
      parent.postMessage({
        type: 'window_close',
        data: ''
      }, CONTACTS_APP_ORIGIN);
    }

    function onClick(e) {
      var target = e.target;

      if (target && target.dataset.uuid) {
        var uuid = target.dataset.uuid;
        var checkbox = target.querySelector('input[type="checkbox"]');
        setChecked(checkbox, !checkbox.checked, uuid);
        mergeButton.disabled = checked === 0 ? true : false;
      }
    }

    function setChecked(element, value, uuid) {
      if (element.checked !== value) {
        // We have to take into account the action whether the value changes
        if (value) {
          ++checked;
          checkedContacts[uuid] = uuid;
        } else {
          --checked;
          delete checkedContacts[uuid];
        }
      }
      element.checked = value;
    }

    function onMerge(e) {
      contacts.MatcherController.merge(checkedContacts);
    }

    // We are going to initialize this module to get references to DOM elements
    init();

    return {
      init: init,

      /*
       * Loads the UI that implements the merge of duplicate contacts
       *
       * @param{Object} Master contact
       *
       * @param{Object} Hash of matching contacts from contacts.Matcher module
       *
       * @param{Function} Success callback when the UI is ready
       *
       */
      load: load
    };

  })();
}
