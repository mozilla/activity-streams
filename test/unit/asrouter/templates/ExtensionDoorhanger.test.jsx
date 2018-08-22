import schema from "content-src/asrouter/templates/CFR/templates/ExtensionDoorhanger.schema.json";

const DEFAULT_CONTENT = {
  "heading": "Recommended Extension",
  "addon": {
    "title": "Addon name",
    "icon": "base64",
    "author": {
      "title": "Author name",
      "url": "https://mozilla.org"
    }
  },
  "content": {
    "text": "Description of addon",
    "url": "https://example.com"
  }
};

describe.only("ExtensionDoorhanger", () => {
  it("should validate DEFAULT_CONTENT", () => {
    assert.jsonSchema(DEFAULT_CONTENT, schema);
  });
});
