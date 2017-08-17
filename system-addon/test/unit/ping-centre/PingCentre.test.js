// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

const {GlobalOverrider, FakePrefs} = require("test/unit/utils");
const {PingCentre, PingCentreConstants} = require("ping-centre/PingCentre.jsm");
const {
  PRODUCTION_ENDPOINT_PREF, FHR_UPLOAD_ENABLED_PREF, TELEMETRY_PREF,
  LOGGING_PREF
} = PingCentreConstants;

/**
 * A reference to the fake preferences object created by the PingCentre
 * constructor so that we can use the API.
 */
let fakePrefs;
const prefInitHook = function() {
  fakePrefs = this; // eslint-disable-line consistent-this
};

const FAKE_TELEMETRY_ID = "foo123";
const FAKE_AS_ENDPOINT_PREF = "some.as.endpoint.pref";

describe("PingCentre", () => {
  let globals;
  let tSender;
  let sandbox;
  let fetchStub;
  const fakeEndpointUrl = "http://127.0.0.1/stuff";
  const fakePingJSON = {action: "fake_action", monkey: 1};
  const fakeFetchHttpErrorResponse = {ok: false, status: 400};
  const fakeFetchSuccessResponse = {ok: true, status: 200};

  beforeEach(() => {
    globals = new GlobalOverrider();
    sandbox = globals.sandbox;
    fetchStub = sandbox.stub();

    sandbox.stub(global.Services.prefs, "getBranch")
        .returns(new FakePrefs({initHook: prefInitHook}));
    globals.set("fetch", fetchStub);
    globals.set("ClientID", {getClientID: sandbox.spy(async () => FAKE_TELEMETRY_ID)});
    globals.set("AppConstants", {MOZ_UPDATE_CHANNEL: "beta"});
    sandbox.spy(global.Components.utils, "reportError");
  });

  afterEach(() => {
    globals.restore();
    FakePrefs.prototype.prefs = {};
  });

  it("should add .telemetryClientId from the ClientID module", async () => {
    tSender = new PingCentre({topic: "activity-stream"});
    assert.equal(await tSender.telemetryClientId, FAKE_TELEMETRY_ID);
  });

  it("should construct the Prefs object", () => {
    tSender = new PingCentre({
      topic: "activity-stream",
      overrideEndpointPref: fakeEndpointUrl
    });

    assert.calledOnce(global.Services.prefs.getBranch);
  });

  it("should throw when topic is not specified", () => {
    assert.throws(() => {
      tSender = new PingCentre({overrideEndpointPref: fakeEndpointUrl});
    });
  });

  describe("setting the telemetry endpoint", () => {
    beforeEach(() => {
      globals.set("AppConstants", {MOZ_UPDATE_CHANNEL: "release"});
      FakePrefs.prototype.prefs[PRODUCTION_ENDPOINT_PREF] = fakeEndpointUrl;
    });

    it("should correctly set endpoint based on topic", () => {
      tSender = new PingCentre({topic: "onboarding"});
      assert.equal(tSender._pingEndpoint, fakeEndpointUrl);
    });
  });

  describe("#enabled", () => {
    let testParams = [
      {enabledPref: true, fhrPref: true, result: true},
      {enabledPref: false, fhrPref: true, result: false},
      {enabledPref: true, fhrPref: false, result: false},
      {enabledPref: false, fhrPref: false, result: false}
    ];

    function testEnabled(p) {
      FakePrefs.prototype.prefs[TELEMETRY_PREF] = p.enabledPref;
      FakePrefs.prototype.prefs[FHR_UPLOAD_ENABLED_PREF] = p.fhrPref;

      tSender = new PingCentre({
        topic: "activity-stream",
        overrideEndpointPref: fakeEndpointUrl
      });

      assert.equal(tSender.enabled, p.result);
    }

    for (let p of testParams) {
      it(`should return ${p.result} if the fhrPref is ${p.fhrPref} and telemetry.enabled is ${p.enabledPref}`, () => {
        testEnabled(p);
      });
    }

    describe("telemetry.enabled pref changes from true to false", () => {
      beforeEach(() => {
        FakePrefs.prototype.prefs = {};
        FakePrefs.prototype.prefs[TELEMETRY_PREF] = true;
        FakePrefs.prototype.prefs[FHR_UPLOAD_ENABLED_PREF] = true;

        tSender = new PingCentre({
          topic: "activity-stream",
          overrideEndpointPref: fakeEndpointUrl
        });
        assert.propertyVal(tSender, "enabled", true);
      });

      it("should set the enabled property to false", () => {
        fakePrefs.setBoolPref(TELEMETRY_PREF, false);

        assert.propertyVal(tSender, "enabled", false);
      });
    });

    describe("telemetry.enabled pref changes from false to true", () => {
      beforeEach(() => {
        FakePrefs.prototype.prefs = {};
        FakePrefs.prototype.prefs[FHR_UPLOAD_ENABLED_PREF] = true;
        FakePrefs.prototype.prefs[TELEMETRY_PREF] = false;
        tSender = new PingCentre({
          topic: "activity-stream",
          overrideEndpointPref: fakeEndpointUrl
        });

        assert.propertyVal(tSender, "enabled", false);
      });

      it("should set the enabled property to true", () => {
        fakePrefs.setBoolPref(TELEMETRY_PREF, true);

        assert.propertyVal(tSender, "enabled", true);
      });
    });

    describe("FHR enabled pref changes from true to false", () => {
      beforeEach(() => {
        FakePrefs.prototype.prefs = {};
        FakePrefs.prototype.prefs[TELEMETRY_PREF] = true;
        FakePrefs.prototype.prefs[FHR_UPLOAD_ENABLED_PREF] = true;
        tSender = new PingCentre({
          topic: "activity-stream",
          overrideEndpointPref: fakeEndpointUrl
        });
        assert.propertyVal(tSender, "enabled", true);
      });

      it("should set the enabled property to false", () => {
        fakePrefs.setBoolPref(FHR_UPLOAD_ENABLED_PREF, false);

        assert.propertyVal(tSender, "enabled", false);
      });
    });

    describe("FHR enabled pref changes from false to true", () => {
      beforeEach(() => {
        FakePrefs.prototype.prefs = {};
        FakePrefs.prototype.prefs[FHR_UPLOAD_ENABLED_PREF] = false;
        FakePrefs.prototype.prefs[TELEMETRY_PREF] = true;
        tSender = new PingCentre({
          topic: "activity-stream",
          overrideEndpointPref: fakeEndpointUrl
        });

        assert.propertyVal(tSender, "enabled", false);
      });

      it("should set the enabled property to true", () => {
        fakePrefs.setBoolPref(FHR_UPLOAD_ENABLED_PREF, true);

        assert.propertyVal(tSender, "enabled", true);
      });
    });
  });

  describe("#sendPing()", () => {
    beforeEach(() => {
      FakePrefs.prototype.prefs = {};
      FakePrefs.prototype.prefs[FHR_UPLOAD_ENABLED_PREF] = true;
      FakePrefs.prototype.prefs[TELEMETRY_PREF] = true;
      FakePrefs.prototype.prefs[FAKE_AS_ENDPOINT_PREF] = fakeEndpointUrl;
      tSender = new PingCentre({
        topic: "activity-stream",
        overrideEndpointPref: FAKE_AS_ENDPOINT_PREF
      });
    });

    it("should not send if the PingCentre is disabled", async () => {
      FakePrefs.prototype.prefs[TELEMETRY_PREF] = false;
      tSender = new PingCentre({
        topic: "activity-stream",
        overrideEndpointPref: fakeEndpointUrl
      });

      await tSender.sendPing(fakePingJSON);

      assert.notCalled(fetchStub);
    });

    it("should POST given ping data to telemetry.ping.endpoint pref w/fetch",
    async () => {
      fetchStub.resolves(fakeFetchSuccessResponse);
      await tSender.sendPing(fakePingJSON);

      const EXPECTED_RESULT = Object.assign({
        topic: "activity-stream",
        client_id: FAKE_TELEMETRY_ID
      }, fakePingJSON);

      assert.calledOnce(fetchStub);
      assert.calledWithExactly(fetchStub, fakeEndpointUrl,
        {method: "POST", body: JSON.stringify(EXPECTED_RESULT)});
    });

    it("should log HTTP failures using Cu.reportError", async () => {
      fetchStub.resolves(fakeFetchHttpErrorResponse);

      await tSender.sendPing(fakePingJSON);

      assert.called(Components.utils.reportError);
    });

    it("should log an error using Cu.reportError if fetch rejects", async () => {
      fetchStub.rejects("Oh noes!");

      await tSender.sendPing(fakePingJSON);

      assert.called(Components.utils.reportError);
    });

    it("should log if logging is on && if action is not activity_stream_performance", async () => {
      globals.sandbox.stub(console, "log");
      FakePrefs.prototype.prefs = {};
      FakePrefs.prototype.prefs[FHR_UPLOAD_ENABLED_PREF] = true;
      FakePrefs.prototype.prefs[TELEMETRY_PREF] = true;
      FakePrefs.prototype.prefs[LOGGING_PREF] =  true;
      fetchStub.resolves(fakeFetchSuccessResponse);
      tSender = new PingCentre({
        topic: "activity-stream",
        overrideEndpointPref: fakeEndpointUrl
      });

      await tSender.sendPing(fakePingJSON);

      assert.called(console.log); // eslint-disable-line no-console
    });
  });

  describe("#uninit()", () => {
    it("should remove the telemetry pref listener", () => {
      tSender = new PingCentre({
        topic: "activity-stream",
        overrideEndpointPref: fakeEndpointUrl
      });
      assert.property(fakePrefs.observers, TELEMETRY_PREF);

      tSender.uninit();

      assert.notProperty(fakePrefs.observers, TELEMETRY_PREF);
    });

    it("should remove the fhrpref listener", () => {
      tSender = new PingCentre({
        topic: "activity-stream",
        overrideEndpointPref: fakeEndpointUrl
      });
      assert.property(fakePrefs.observers, FHR_UPLOAD_ENABLED_PREF);

      tSender.uninit();

      assert.notProperty(fakePrefs.observers, FHR_UPLOAD_ENABLED_PREF);
    });

    it("should remove the telemetry log listener", () => {
      tSender = new PingCentre({topic: "activity-stream"});
      assert.property(fakePrefs.observers, LOGGING_PREF);

      tSender.uninit();

      assert.notProperty(fakePrefs.observers, TELEMETRY_PREF);
    });

    it("should call Cu.reportError if this._prefs.removeObserver throws", () => {
      globals.sandbox.stub(FakePrefs.prototype, "removeObserver").throws("Some Error");
      tSender = new PingCentre({
        topic: "activity-stream",
        overrideEndpointPref: fakeEndpointUrl
      });

      tSender.uninit();

      assert.called(global.Components.utils.reportError);
    });
  });

  describe("Misc pref changes", () => {
    describe("performance.log changes from false to true", () => {
      it("should change this.logging from false to true", () => {
        FakePrefs.prototype.prefs = {};
        FakePrefs.prototype.prefs[LOGGING_PREF] = false;
        tSender = new PingCentre({
          topic: "activity-stream",
          overrideEndpointPref: fakeEndpointUrl
        });
        assert.propertyVal(tSender, "logging", false);

        fakePrefs.setBoolPref(LOGGING_PREF, true);

        assert.propertyVal(tSender, "logging", true);
      });
    });
  });
});
