"use strict";

const test = require("sdk/test");
const prefService = require("sdk/preferences/service");
const ss = require("sdk/simple-storage");
const {ActivityStreams} = require("lib/ActivityStreams");

exports["test activity stream loads on home page when appropriate"] = function*(assert) {
  prefService.set("browser.startup.homepage", "about:home");
  let url = "http://foo.bar/baz";
  let app = new ActivityStreams({pageURL: url});

  // By default, the home page should be set to ActivityStream.
  assert.equal(url + "#/", prefService.get("browser.startup.homepage"));

  // Unload ActivityStream and it should be unset.
  app.unload();
  assert.ok(!prefService.isSet("browser.startup.homepage"));

  // If the pref is already overriden, ActivityStream shouldn't change it.
  prefService.set("browser.startup.homepage", "https://example.com");
  app = new ActivityStreams({pageURL: url});
  assert.equal("https://example.com", prefService.get("browser.startup.homepage"));
  app.unload();
  assert.equal("https://example.com", prefService.get("browser.startup.homepage"));

  // If we override the pref and the user changes it back to about:home,
  // ActivityStream shouldn't change it on next load.
  prefService.set("browser.startup.homepage", "about:home");
  ss.storage.homepageOverriden = true;
  app = new ActivityStreams({pageURL: url});
  assert.equal("about:home", prefService.get("browser.startup.homepage"));
  app.unload();
  assert.equal("about:home", prefService.get("browser.startup.homepage"));

};

test.run(exports);
