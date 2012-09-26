var fb = window.fb || {};

if(typeof fb.msg === 'undefined') {
  (function(document) {
    var Msg = fb.msg = {};
    var to;
    var message;

    Msg.CID_PARAM = 'contactid';

    Msg.wallPost = function(uid,msg) {
      to = uid;
      message = msg;
      fb.oauth.getAccessToken(doWallPost, 'wallPost');
    }

    Msg.sendPrivate = function(uid,msg) {
      // TODO: To be implented
    }

    function doWallPost(token) {
      var msgWallService = 'https://graph.facebook.com/#/feed?method=POST';

      msgWallService = msgWallService.replace(/#/, to);

      var params = [fb.ACC_T + '=' + token,
                    'message=' + message, 'callback=fb.msg.ui.wallPosted'];

      var q = params.join('&');

      var jsonp = document.createElement('script');
      jsonp.src = msgWallService + '&' + q;

      document.body.appendChild(jsonp);
    }

    var UI = Msg.ui = {};

    UI.wallPost = function() {
      var text = document.querySelector('#post-text').value;

      if(text && text.length > 0) {
        document.body.dataset.state = 'waiting';
        Msg.wallPost(to,text);
      }
    }

    UI.wallPosted = function(result) {
      UI.end();
      window.console.log(JSON.stringify(result));
    }

    UI.end = function() {
       var msg = {
        type: 'window_close',
        data: ''
      };

      parent.postMessage(msg, fb.CONTACTS_APP_ORIGIN);
    }

    UI.init = function (cid) {
      var req = fb.utils.getContactData(cid);

      req.onsuccess = function() {
        var fbContact = new fb.Contact(req.result);
        to = fbContact.uid;

        document.querySelector('#to-name').textContent = req.result.name;
      }

      req.onerror = function() {
        window.console.error('Contacts FB Post Wall: Contact not found');
      }
    }

  })(document);
}


