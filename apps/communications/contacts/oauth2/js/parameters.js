var oauthflow = this.oauthflow || {};

oauthflow.params = {

  facebook: {
    appOrigin:
      'app://communications.gaiamobile.org',
    redirectURI:
      'http://intense-tundra-4122.herokuapp.com/fbowd/oauth2_new/flow.html',
    loginPage:
      'https://m.facebook.com/dialog/oauth/?',
    get applicationId() {
      return (window.config && window.config.appId) ||
              (parent.config && parent.config.appId);
    },
    scope:
      ['friends_about_me', 'friends_birthday', 'friends_hometown',
       'friends_location', 'friends_work_history', 'read_stream'],
    redirectMsg:
    'http://intense-tundra-4122.herokuapp.com/fbowd/oauth2_new/dialogs_end.html',
    redirectLogout:
      'http://intense-tundra-4122.herokuapp.com/fbowd/oauth2_new/logout.json'
  },

  live: {
    appOrigin:
      'app://communications.gaiamobile.org',
    redirectURI:
      'https://serene-cove-3587.herokuapp.com/liveowd/oauth2_new/flow_live.html',
    loginPage:
      'https://login.live.com/oauth20_authorize.srf?',
    applicationId:
      '00000000480EABC6',
    scope:
      ['wl.basic', 'wl.contacts_emails', 'wl.contacts_phone_numbers',
       'wl.contacts_birthday', 'wl.contacts_postal_addresses'],
    logoutUrl:
      'https://login.live.com/logout.srf'
  },

  gmail: {
    appOrigin:
      'app://communications.gaiamobile.org',
    redirectURI:
      'https://serene-cove-3587.herokuapp.com/liveowd/oauth2_new/flow_live.html',
    loginPage:
      'https://accounts.google.com/o/oauth2/auth?',
    applicationId:
      '664741361278.apps.googleusercontent.com',
    scope:
      ['https://www.google.com/m8/feeds/'],
    logoutUrl:
      'https://accounts.google.com/Logout'
  }
};
