/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const {ActivityStreamStorage} = ChromeUtils.import("resource://activity-stream/lib/ActivityStreamStorage.jsm", {});
const {actionCreators: ac, actionTypes: at} = ChromeUtils.import("resource://activity-stream/common/Actions.jsm", {});
const {Prefs} = ChromeUtils.import("resource://activity-stream/lib/ActivityStreamPrefs.jsm", {});
const {PrerenderData} = ChromeUtils.import("resource://activity-stream/common/PrerenderData.jsm", {});
ChromeUtils.import("resource://gre/modules/Services.jsm");

ChromeUtils.defineModuleGetter(this, "PrivateBrowsingUtils",
  "resource://gre/modules/PrivateBrowsingUtils.jsm");

const ONBOARDING_FINISHED_PREF = "browser.onboarding.notification.finished";

this.PrefsFeed = class PrefsFeed {
  constructor(prefMap) {
    this._prefMap = prefMap;
    this._prefs = new Prefs();
    this._storage = new ActivityStreamStorage("sectionPrefs");
  }

  // If the any prefs are set to something other than what the prerendered version
  // of AS expects, we can't use it.
  async _setPrerenderPref() {
    if (!this._storage.intialized) {
      await this._storage.init();
    }
    const indexedDBPrefs = await this._storage.getAll();
    this._prefs.set("prerender", PrerenderData.arePrefsValid(pref => this._prefs.get(pref), indexedDBPrefs));
  }

  _checkPrerender(name) {
    if (PrerenderData.invalidatingPrefs.includes(name)) {
      this._setPrerenderPref();
    }
  }

  _initOnboardingPref() {
    const snippetsEnabled = this._prefs.get("feeds.snippets");
    if (!snippetsEnabled) {
      this.setOnboardingDisabledDefault(true);
    }
  }

  setOnboardingDisabledDefault(value) {
    const branch = Services.prefs.getDefaultBranch("");
    branch.setBoolPref(ONBOARDING_FINISHED_PREF, value);
  }

  onPrefChanged(name, value) {
    if (this._prefMap.has(name)) {
      this.store.dispatch(ac.BroadcastToContent({type: at.PREF_CHANGED, data: {name, value}}));
    }

    this._checkPrerender(name);

    if (name === "feeds.snippets") {
      // If snippets are disabled, onboarding notifications should also be
      // disabled because they look like snippets.
      this.setOnboardingDisabledDefault(!value);
    }
  }

  init() {
    this._prefs.observeBranch(this);

    // Get the initial value of each activity stream pref
    const values = {};
    for (const name of this._prefMap.keys()) {
      values[name] = this._prefs.get(name);
    }

    // Not a pref, but we need this to determine whether to show private-browsing-related stuff
    values.isPrivateBrowsingEnabled = PrivateBrowsingUtils.enabled;

    // Set the initial state of all prefs in redux
    this.store.dispatch(ac.BroadcastToContent({type: at.PREFS_INITIAL_VALUES, data: values}));

    this._setPrerenderPref();
    this._initOnboardingPref();
  }

  removeListeners() {
    this._prefs.ignoreBranch(this);
  }

  async _setIndexedDBPref(id, value) {
    const prefName = id === "topsites" ? id : `feeds.section.${id}`;
    if (!this._storage.initialized) {
      await this._storage.init();
    }
    const prefs = await this._storage.get(id);
    await this._storage.set(prefName, Object.assign({}, prefs, value));
    this._setPrerenderPref();
  }

  onAction(action) {
    switch (action.type) {
      case at.INIT:
        this.init();
        break;
      case at.UNINIT:
        this.removeListeners();
        this.setOnboardingDisabledDefault(false);
        break;
      case at.SET_PREF:
        this._prefs.set(action.data.name, action.data.value);
        break;
      case at.DISABLE_ONBOARDING:
        this.setOnboardingDisabledDefault(true);
        break;
      // IndexedDB pref changes
      case at.UPDATE_SECTION_PREFS:
        this._setIndexedDBPref(action.data.id, action.data.value);
        break;
    }
  }
};

const EXPORTED_SYMBOLS = ["PrefsFeed"];
