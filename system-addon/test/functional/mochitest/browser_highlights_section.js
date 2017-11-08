"use strict";

add_task(async function setup() {
  registerCleanupFunction(async () => {
    await setUpActivityStreamTest();
  });
});

async function add_highlights_bookmark(count) {
  const bookmarks = new Array(count).fill(null).map((entry, i) => ({
    parentGuid: PlacesUtils.bookmarks.unfiledGuid,
    title: "foo",
    url: `https://mozilla${i}.com/nowNew`
  }));

  for (let placeInfo of bookmarks) {
    await PlacesUtils.bookmarks.insert(placeInfo);
  }

  // Add bookmark visits
  for (let placeInfo of bookmarks) {
    await PlacesTestUtils.addVisits(placeInfo.url);
  }
}

// Test populating highlights section with bookmarks.
add_task(async function getHighlights() {
  const count = 2;

  await setUpActivityStreamTest();
  await add_highlights_bookmark(count);

  let selector = ".card-outer:not(.placeholder)";
  let message = "found cards";

  // it should display two highlights cards instead of placeholders.
  await check_highlights_elements(selector, count, message);

  selector = ".card-context-icon.icon-bookmark-added";
  message = "found bookmarks";

  // it should display two highlights cards with bookmark indicators.
  await check_highlights_elements(selector, count, message);
});

// Test highlights context menu.
add_task(async function highlights_context_menu() {
  const count = 1;

  await setUpActivityStreamTest();
  await add_highlights_bookmark(count);

  let selector = ".card-outer:not(.placeholder)";
  let message = "found cards";

  // it should display two highlights cards.
  await check_highlights_elements(selector, count, message);

  // it should be able to click the context menu indicator and discover the context menu.
  await simulate_click(".section-list .context-menu-button", ".context-menu", message);
});
