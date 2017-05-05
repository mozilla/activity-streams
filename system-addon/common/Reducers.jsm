/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const {actionTypes: at} = Components.utils.import("resource://activity-stream/common/Actions.jsm", {});

const INITIAL_STATE = {
  App: {
    // Have we received real data from the app yet?
    initialized: false,
    // The locale of the browser
    locale: "",
    // Localized strings with defaults
    strings: {},
    // The version of the system-addon
    version: null
  },
  TopSites: {
    // Have we received real data from history yet?
    initialized: false,
    // The history (and possibly default) links
    rows: []
  },
  Search: {
    // The search engine currently set by the browser
    currentEngine: {
      name: "",
      icon: ""
    },
    // All possible search engines
    engines: []
  }
};

function App(prevState = INITIAL_STATE.App, action) {
  switch (action.type) {
    case at.INIT:
      return Object.assign({}, action.data || {}, {initialized: true});
    case at.LOCALE_UPDATED: {
      if (!action.data) {
        return prevState;
      }
      let {locale, strings} = action.data;
      return Object.assign({}, prevState, {
        locale,
        strings
      });
    }
    default:
      return prevState;
  }
}

function TopSites(prevState = INITIAL_STATE.TopSites, action) {
  let hasMatch;
  let newRows;
  switch (action.type) {
    case at.TOP_SITES_UPDATED:
      if (!action.data) {
        return prevState;
      }
      return Object.assign({}, prevState, {initialized: true, rows: action.data});
    case at.SCREENSHOT_UPDATED:
      newRows = prevState.rows.map(row => {
        if (row.url === action.data.url) {
          hasMatch = true;
          return Object.assign({}, row, {screenshot: action.data.screenshot});
        }
        return row;
      });
      return hasMatch ? Object.assign({}, prevState, {rows: newRows}) : prevState;
    default:
      return prevState;
  }
}

function Search(prevState = INITIAL_STATE.Search, action) {
  switch (action.type) {
    case at.SEARCH_STATE_UPDATED: {
      if (!action.data) {
        return prevState;
      }
      let {currentEngine, engines} = action.data;
      return Object.assign({}, prevState, {
        currentEngine,
        engines
      });
    }
    default:
      return prevState;
  }
}
this.INITIAL_STATE = INITIAL_STATE;
this.reducers = {TopSites, App, Search};

this.EXPORTED_SYMBOLS = ["reducers", "INITIAL_STATE"];
