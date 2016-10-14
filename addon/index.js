/* globals require, exports */
"use strict";
const self = require("sdk/self");
const shield = require("./shield-utils/index");
const {when: unload} = require("sdk/system/unload");
const {Feature} = require("./shield");
const feature = new Feature();

const studyConfig = {
  name: "ACTIVITY_STREAM",
  days: 14,
  variations: {
    "ActivityStream": () => feature.loadActivityStream(),
    "Tiles": () => feature.loadTiles()
  }
};

class OurStudy extends shield.Study {
  isEligible() {
    return super.isEligible() && feature.isEligible();
  }
  shutdown(reason, variant) {
    feature.shutdown(reason, variant);
  }
  setVariant(variant) {
    feature.setVariant(variant);
  }
  checkTestPilot() {
    return new Promise(resolve => {
      feature.doesHaveTestPilot().then(resolve);
    });
  }
}
const thisStudy = new OurStudy(studyConfig);
thisStudy.setVariant(thisStudy.variation);
thisStudy.checkTestPilot().then(() => thisStudy.startup(self.loadReason));
unload(reason => thisStudy.shutdown(reason, thisStudy.variation));
