var assert = require('assert');
var { URL_PREFIX, ADMIN_USER, TEST_USER } = require('../fixtures.js');
const webUI = require('../web-ui.js');

// TODO: make sure that DB is clear
// mongo openwhyd_test --eval "db.dropDatabase();"

function takeSnapshot() {
    var results = browser.checkDocument(); // http://webdriver.io/guide/services/visual-regression.html
    results.forEach((result) => {
        assert(result.isWithinMisMatchTolerance, 'a difference was find on a snapshot');
    });
}

browser.waitForContent = function(regex, context) {
    return browser.waitUntil(() => regex.test(
        browser.getHTML(context || 'body')),
        5000,
        `${regex.toString()} should be in the page within 5 seconds`
    );
};

before(function() {
    // make sure that openwhyd/whydjs server is tested against the test database
    browser.url(URL_PREFIX + `/login?action=login&email=${encodeURIComponent(ADMIN_USER.email)}&md5=${ADMIN_USER.md5}`);
    browser.url(URL_PREFIX + '/admin/config/config.json');
    var config = JSON.parse(browser.getText('pre')).json;
    assert.equal(config.mongoDbDatabase, 'openwhyd_test');
    browser.url(URL_PREFIX + '/login?action=logout');
});

// reference scenario: https://www.youtube.com/watch?v=aZT8VlTV1YY

describe('landing page page', function() {

    it('should not let visitors access admin endpoints', function () {
        browser.url(URL_PREFIX + '/admin/config/config.json');
        assert(!browser.isExisting('pre'));
    });

    it('should have Openwhyd in its title', function () {
        browser.url(URL_PREFIX);
        var title = browser.getTitle();
        assert(/Openwhyd/.test(title));
    });

    it('should not have changed from previous build', function() {
        browser.url(URL_PREFIX);
        var results = browser.checkDocument(); // http://webdriver.io/guide/services/visual-regression.html
        results.forEach((result) => {
            assert(result.isWithinMisMatchTolerance);
        });
    });
});

describe('onboarding', function() {

    it('should lead new user to genre selection page', function() {
        browser
            .url(URL_PREFIX)
            .click('#signup')
            .waitForVisible('input[name="email"]');
        browser
            .setValue('input[name="name"]', TEST_USER.username)
            .setValue('input[name="email"]', TEST_USER.email)
            .setValue('input[name="password"]', TEST_USER.pwd);
        // TODO: takeSnapshot();
        browser
            .click('input[type="submit"]')
            .waitUntil(
                () => /.*\/pick\/genres/.test(browser.getUrl()), 5000,
                'expected to be on /pick/genres after 5s'
            );
        // TODO: takeSnapshot();
    });

    it('should suggest people to follow after picking genres', function() {
        const genres = $$('#genreGallery li');
        genres.find(genre => /INDIE/.test(genre.getText())).click();
        genres.find(genre => /ROCK/.test(genre.getText())).click();
        genres.find(genre => /PUNK/.test(genre.getText())).click();
        // TODO: takeSnapshot();
        $$('a').find(a => a.getText() === 'Next').click();
        browser.waitUntil(
            () => /.*\/pick\/people/.test(browser.getUrl()), 5000,
            'expected to be on /pick/people after 5s'
        );
    });

    it('should suggest to install the extension after picking people', function() {
        // TODO: takeSnapshot();
        $$('a').find(a => a.getText() === 'Next').click();
        browser.waitUntil(
            () => /.*\/pick\/button/.test(browser.getUrl()), 5000,
            'expected to be on /pick/button after 5s'
        );
    });

    it('should lead new user to the welcome page, after installing extension', function() {
        // TODO: takeSnapshot();
        $$('a').find(a => a.getText() === 'Next').click();
        browser.waitUntil(
            () => /.*\/welcome/.test(browser.getUrl()), 5000,
            'expected to be on /welcome after 5s'
        );
    });

    it('should display user name after skipping the welcome tutorial', function() {
        // TODO: takeSnapshot();
        browser.waitForContent(/Ok\, Got it/);
        //$$('div').find(a => /Ok\, Got it/.test(a.getText())).click(); // does not trigger. not useful anyway.
        var loggedInUsername = browser.getText('#loginDiv .username');
        assert.equal(loggedInUsername, TEST_USER.username);
    });

    webUI.logout();
});

describe('adding a track', function() {

    webUI.loginAs(ADMIN_USER);

    it('should recognize a track when pasting a Youtube URL in the search box', function() {
        $('#q').setValue('https://www.youtube.com/watch?v=aZT8VlTV1YY');
        browser.waitUntil(
            () => $$('#searchResults li a').find(a => /Demo/.test(a.getText())), 5000,
            'expected to find a search result after 5s'
        );
    });

    it('should lead to a track page when clicking on the Youtube search result', function() {
        browser.click('#searchResults li a');
        browser.waitUntil(
            () => /\/yt\/aZT8VlTV1YY/.test(browser.getUrl()), 5000,
            'expected to be on /yt/aZT8VlTV1YY after 5s'
        );
    });

    it('should open a dialog after clicking on the "Add to" button', function() {
        browser.waitForContent(/Add to/);
        $$('a').find(a => /Add to/.test(a.getText())).click();
        browser.waitForVisible('.dlgPostBox');
    });

    it('should show a link to the post after adding the track', function() {
        $$('.dlgPostBox span').find(a => /Add/.test(a.getText())).click();
        browser.waitUntil(
            () => $$('a').find(a => /your tracks/.test(a.getText())), 5000,
            'expected to find a "your tracks" link after 5s');
    });

    it('should show the post on the user\'s profile after clicking the link', function() {
        $$('a').find(a => /your tracks/.test(a.getText())).click();
        browser.waitUntil(
            () => /\/u\//.test(browser.getUrl()), 5000,
            'expected to be on the user\'s profile page after 5s');
        browser.waitForVisible('.post a[data-eid="/yt/aZT8VlTV1YY"]');
    });

    it('should open the playbar after the user clicks on the post', function() {
        browser.click('.post a[data-eid="/yt/aZT8VlTV1YY"]');
        browser.waitForVisible('#btnPlay');
    });

    it('should play the track', function() {
        browser.waitForVisible('#btnPlay.playing');
    });

    it('should pause the track when the user clicks on the play/pause button', function() {
        browser.click('#btnPlay.playing');
        assert(!/playing/.test($('#btnPlay').classname));
    });

    //webUI.logout();
});

describe('re-adding a track in a playlist', function() {

    // requirement: one track should be accessible from the user's stream

    // webUI.loginAs(ADMIN_USER);

    it('will display a pop-in dialog when clicking the "Add to" button of that track', function() {
        browser.waitForContent(/Add to/);
        $$('a').find(a => /Add to/.test(a.getText())).click();
        browser.waitForVisible('.dlgPostBox');
    });

    it('allows to create a new playlist', function() {
        $('#selPlaylist').click();
        browser.waitForContent(/Create/, '#selPlaylist');
        $('#newPlaylistName').setValue('test playlist');
        //browser.waitForVisible('input[type="submit"]');
        $('input[value="Create"]').click();
        browser.waitForContent(/test playlist/, '#selPlaylist');
    });

    it('should show a link to the post after re-adding the track', function() {
        $$('.dlgPostBox span').find(a => /Add/.test(a.getText())).click();
        browser.waitUntil(
            () => $$('a').find(a => /test playlist/.test(a.getText())), 5000,
            'expected to find a "test playlist" link after 5s');
    });

    it('should show the post on the user\'s new playlist after clicking the link', function() {
        $$('a').find(a => /test playlist/.test(a.getText())).click();
        browser.waitUntil(
            () => /\/u\//.test(browser.getUrl()), 5000,
            'expected to be on the user\'s playlist page after 5s');
        browser.waitForVisible('.post a[data-eid="/yt/aZT8VlTV1YY"]');
    });

    //webUI.logout();
});

describe('track comments', function() {

    // requirement: at least one track should be accessible from the user's stream

    // webUI.loginAs(ADMIN_USER);

    it(`can be displayed from the user\'s stream`, function() {
        browser.url(URL_PREFIX + '/stream');
        $$('a').find(a => /Comment/.test(a.getText())).click();
        browser.waitForContent(/You can mention people/);
    });

    it(`should appear after being added`, function() {
        browser.keys('hello world\n');
        browser.waitForContent(new RegExp(ADMIN_USER.name), '.comments');
        browser.waitForContent(/hello world/, '.comments');
    });

    // TODO: it(`should change after being updated`, function() {

    // TODO: it(`should disappear after being deleted`, function() {

});

// Webdriver API documentation: http://webdriver.io/api.html
