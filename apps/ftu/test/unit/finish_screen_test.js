/* global FinishScreen, MocksHelper */

'use strict';

requireApp('test/unit/mock_screenlayout.js');

requireApp('js/finish_screen.js');
requireApp('js/utils.js');

suite('FinishScreen >', function() {
  var mocksHelperForFTU = new MocksHelper([
    'ScreenLayout'
  ]).init();

  mocksHelperForFTU.attachTestHelpers();

  suiteSetup(function() {
    mocksHelperForFTU.attachTestHelpers();
    loadBodyHTML('/index.html');
  });

  suiteTeardown(function() {
    document.body.innerHTML = '';
  });


  test(' init', function() {
    this.sinon.spy(window, 'close');
    // We call to FinishScreen
    FinishScreen.init();

    // Is shown? We know by default the layout is tiny
    assert.isTrue(
      document.getElementById('tutorial-finish-tiny').classList.contains('show')
    );
    // As is tiny, a click should be enough to close the app
    document.getElementById('tutorialFinished').click();
    assert.isTrue(window.close.calledOnce);
    // Reset the spy
    window.close.reset();
  });
});
