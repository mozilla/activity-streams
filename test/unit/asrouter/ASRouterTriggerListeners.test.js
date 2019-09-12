import { ASRouterTriggerListeners } from "lib/ASRouterTriggerListeners.jsm";
import { GlobalOverrider } from "test/unit/utils";

describe("ASRouterTriggerListeners", () => {
  let sandbox;
  let globals;
  let windowEnumeratorStub;
  let existingWindow;
  let isWindowPrivateStub;
  const triggerHandler = () => {};
  const openURLListener = ASRouterTriggerListeners.get("openURL");
  const frequentVisitsListener = ASRouterTriggerListeners.get("frequentVisits");
  const hosts = ["www.mozilla.com", "www.mozilla.org"];

  function resetEnumeratorStub(windows) {
    windowEnumeratorStub.withArgs("navigator:browser").returns(windows);
  }

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
    globals = new GlobalOverrider();
    existingWindow = {
      gBrowser: {
        addTabsProgressListener: sandbox.stub(),
        removeTabsProgressListener: sandbox.stub(),
        currentURI: { host: "" },
      },
      addEventListener: sinon.stub(),
      removeEventListener: sinon.stub(),
    };
    windowEnumeratorStub = sandbox.stub(global.Services.wm, "getEnumerator");
    resetEnumeratorStub([existingWindow]);
    sandbox.spy(openURLListener, "init");
    sandbox.spy(openURLListener, "uninit");
    isWindowPrivateStub = sandbox.stub();
    // Assume no window is private so that we execute the action
    isWindowPrivateStub.returns(false);
    globals.set("PrivateBrowsingUtils", {
      isWindowPrivate: isWindowPrivateStub,
    });
    const ewUninit = new Map();
    globals.set("EveryWindow", {
      registerCallback: (id, init, uninit) => {
        init(existingWindow);
        ewUninit.set(id, uninit);
      },
      unregisterCallback: id => {
        ewUninit.get(id)(existingWindow);
      },
    });
  });
  afterEach(() => {
    sandbox.restore();
    globals.restore();
  });

  describe("frequentVisits", () => {
    let _triggerHandler;
    beforeEach(() => {
      _triggerHandler = sandbox.stub();
      sandbox.useFakeTimers();
      frequentVisitsListener.init(_triggerHandler, hosts);
    });
    afterEach(() => {
      sandbox.clock.restore();
      frequentVisitsListener.uninit();
    });
    it("should be initialized", () => {
      assert.isTrue(frequentVisitsListener._initialized);
    });
    it("should listen for TabSelect events", () => {
      assert.calledOnce(existingWindow.addEventListener);
      assert.calledWith(
        existingWindow.addEventListener,
        "TabSelect",
        frequentVisitsListener.onTabSwitch
      );
    });
    it("should call _triggerHandler if the visit is valid (is recoreded)", () => {
      frequentVisitsListener.triggerHandler({}, "www.mozilla.com");

      assert.calledOnce(_triggerHandler);
    });
    it("should call _triggerHandler only once", () => {
      frequentVisitsListener.triggerHandler({}, "www.mozilla.com");
      frequentVisitsListener.triggerHandler({}, "www.mozilla.com");

      assert.calledOnce(_triggerHandler);
    });
    it("should call _triggerHandler again after 15 minutes", () => {
      frequentVisitsListener.triggerHandler({}, "www.mozilla.com");
      sandbox.clock.tick(15 * 60 * 1000 + 1);
      frequentVisitsListener.triggerHandler({}, "www.mozilla.com");

      assert.calledTwice(_triggerHandler);
    });
    it("should call triggerHandler on valid hosts", () => {
      const stub = sandbox.stub(frequentVisitsListener, "triggerHandler");
      existingWindow.gBrowser.currentURI.host = hosts[0]; // eslint-disable-line prefer-destructuring

      frequentVisitsListener.onTabSwitch({
        target: { ownerGlobal: existingWindow },
      });

      assert.calledOnce(stub);
    });
    it("should not call triggerHandler on invalid hosts", () => {
      const stub = sandbox.stub(frequentVisitsListener, "triggerHandler");
      existingWindow.gBrowser.currentURI.host = "foo.com";

      frequentVisitsListener.onTabSwitch({
        target: { ownerGlobal: existingWindow },
      });

      assert.notCalled(stub);
    });
    describe("MatchPattern", () => {
      beforeEach(() => {
        globals.set(
          "MatchPatternSet",
          sandbox.stub().callsFake(patterns => ({ patterns }))
        );
      });
      afterEach(() => {
        frequentVisitsListener.uninit();
      });
      it("should create a matchPatternSet", () => {
        frequentVisitsListener.init(_triggerHandler, hosts, ["pattern"]);

        assert.calledOnce(window.MatchPatternSet);
        assert.calledWithExactly(window.MatchPatternSet, ["pattern"], {
          ignorePath: true,
        });
      });
      it("should allow to add multiple patterns and dedupe", () => {
        frequentVisitsListener.init(_triggerHandler, hosts, ["pattern"]);
        frequentVisitsListener.init(_triggerHandler, hosts, ["foo"]);

        assert.calledTwice(window.MatchPatternSet);
        assert.calledWithExactly(
          window.MatchPatternSet,
          new Set(["pattern", "foo"]),
          { ignorePath: true }
        );
      });
    });
  });

  describe("openURL listener", () => {
    it("should exist and initially be uninitialised", () => {
      assert.ok(openURLListener);
      assert.notOk(openURLListener._initialized);
    });

    describe("#init", () => {
      beforeEach(() => {
        openURLListener.init(triggerHandler, hosts);
      });
      afterEach(() => {
        openURLListener.uninit();
      });

      it("should set ._initialized to true and save the triggerHandler and hosts", () => {
        assert.ok(openURLListener._initialized);
        assert.deepEqual(openURLListener._hosts, new Set(hosts));
        assert.equal(openURLListener._triggerHandler, triggerHandler);
      });

      it("should add tab progress listeners to all existing browser windows", () => {
        assert.calledOnce(existingWindow.gBrowser.addTabsProgressListener);
        assert.calledWithExactly(
          existingWindow.gBrowser.addTabsProgressListener,
          openURLListener
        );
      });

      it("if already initialised, should only update the trigger handler and add the new hosts", () => {
        const newHosts = ["www.example.com"];
        const newTriggerHandler = () => {};
        resetEnumeratorStub([existingWindow]);
        existingWindow.gBrowser.addTabsProgressListener.reset();

        openURLListener.init(newTriggerHandler, newHosts);
        assert.ok(openURLListener._initialized);
        assert.deepEqual(
          openURLListener._hosts,
          new Set([...hosts, ...newHosts])
        );
        assert.equal(openURLListener._triggerHandler, newTriggerHandler);
        assert.notCalled(existingWindow.gBrowser.addTabsProgressListener);
      });
    });

    describe("#uninit", () => {
      beforeEach(async () => {
        openURLListener.init(triggerHandler, hosts);
        // Ensure that the window enumerator will return the existing window for uninit as well
        resetEnumeratorStub([existingWindow]);
        openURLListener.uninit();
      });

      it("should set ._initialized to false and clear the triggerHandler and hosts", () => {
        assert.notOk(openURLListener._initialized);
        assert.equal(openURLListener._hosts, null);
        assert.equal(openURLListener._triggerHandler, null);
      });

      it("should remove tab progress listeners from all existing browser windows", () => {
        assert.calledOnce(existingWindow.gBrowser.removeTabsProgressListener);
        assert.calledWithExactly(
          existingWindow.gBrowser.removeTabsProgressListener,
          openURLListener
        );
      });

      it("should do nothing if already uninitialised", () => {
        existingWindow.gBrowser.removeTabsProgressListener.reset();
        resetEnumeratorStub([existingWindow]);

        openURLListener.uninit();
        assert.notOk(openURLListener._initialized);
        assert.notCalled(existingWindow.gBrowser.removeTabsProgressListener);
      });
    });

    describe("#onLocationChange", () => {
      afterEach(() => {
        openURLListener.uninit();
        frequentVisitsListener.uninit();
      });

      it("should call the ._triggerHandler with the right arguments", () => {
        const newTriggerHandler = sinon.stub();
        openURLListener.init(newTriggerHandler, hosts);

        const browser = {};
        const webProgress = { isTopLevel: true };
        const location = "www.mozilla.org";
        openURLListener.onLocationChange(browser, webProgress, undefined, {
          host: location,
          spec: location,
        });
        assert.calledOnce(newTriggerHandler);
        assert.calledWithExactly(newTriggerHandler, browser, {
          id: "openURL",
          param: { host: "www.mozilla.org", url: "www.mozilla.org" },
        });
      });
      it("should call triggerHandler for a redirect (openURL + frequentVisits)", () => {
        for (let trigger of [openURLListener, frequentVisitsListener]) {
          const newTriggerHandler = sinon.stub();
          trigger.init(newTriggerHandler, hosts);

          const browser = {};
          const webProgress = { isTopLevel: true };
          const aLocationURI = {
            host: "subdomain.mozilla.org",
            spec: "subdomain.mozilla.org",
          };
          const aRequest = {
            QueryInterface: sandbox.stub().returns({
              originalURI: { spec: "www.mozilla.org", host: "www.mozilla.org" },
            }),
          };
          trigger.onLocationChange(
            browser,
            webProgress,
            aRequest,
            aLocationURI
          );
          assert.calledOnce(aRequest.QueryInterface);
          assert.calledOnce(newTriggerHandler);
        }
      });
      it("should call triggerHandler with the right arguments (redirect)", () => {
        const newTriggerHandler = sinon.stub();
        openURLListener.init(newTriggerHandler, hosts);

        const browser = {};
        const webProgress = { isTopLevel: true };
        const aLocationURI = {
          host: "subdomain.mozilla.org",
          spec: "subdomain.mozilla.org",
        };
        const aRequest = {
          QueryInterface: sandbox.stub().returns({
            originalURI: { spec: "www.mozilla.org", host: "www.mozilla.org" },
          }),
        };
        openURLListener.onLocationChange(
          browser,
          webProgress,
          aRequest,
          aLocationURI
        );
        assert.calledWithExactly(newTriggerHandler, browser, {
          id: "openURL",
          param: { host: "www.mozilla.org", url: "www.mozilla.org" },
        });
      });
      it("should call triggerHandler for a redirect (openURL + frequentVisits)", () => {
        for (let trigger of [openURLListener, frequentVisitsListener]) {
          const newTriggerHandler = sinon.stub();
          trigger.init(newTriggerHandler, hosts);

          const browser = {};
          const webProgress = { isTopLevel: true };
          const aLocationURI = {
            host: "subdomain.mozilla.org",
            spec: "subdomain.mozilla.org",
          };
          const aRequest = {
            QueryInterface: sandbox.stub().returns({
              originalURI: { spec: "www.mozilla.org", host: "www.mozilla.org" },
            }),
          };
          trigger.onLocationChange(
            browser,
            webProgress,
            aRequest,
            aLocationURI
          );
          assert.calledOnce(aRequest.QueryInterface);
          assert.calledOnce(newTriggerHandler);
        }
      });
      it("should call triggerHandler with the right arguments (redirect)", () => {
        const newTriggerHandler = sinon.stub();
        openURLListener.init(newTriggerHandler, hosts);

        const browser = {};
        const webProgress = { isTopLevel: true };
        const aLocationURI = {
          host: "subdomain.mozilla.org",
          spec: "subdomain.mozilla.org",
        };
        const aRequest = {
          QueryInterface: sandbox.stub().returns({
            originalURI: { spec: "www.mozilla.org", host: "www.mozilla.org" },
          }),
        };
        openURLListener.onLocationChange(
          browser,
          webProgress,
          aRequest,
          aLocationURI
        );
        assert.calledWithExactly(newTriggerHandler, browser, {
          id: "openURL",
          param: { host: "www.mozilla.org", url: "www.mozilla.org" },
        });
      });
      it("should fail for subdomains (not redirect)", () => {
        const newTriggerHandler = sinon.stub();
        openURLListener.init(newTriggerHandler, hosts);

        const browser = {};
        const webProgress = { isTopLevel: true };
        const aLocationURI = {
          host: "subdomain.mozilla.org",
          spec: "subdomain.mozilla.org",
        };
        const aRequest = {
          QueryInterface: sandbox.stub().returns({
            originalURI: {
              spec: "subdomain.mozilla.org",
              host: "subdomain.mozilla.org",
            },
          }),
        };
        openURLListener.onLocationChange(
          browser,
          webProgress,
          aRequest,
          aLocationURI
        );
        assert.calledOnce(aRequest.QueryInterface);
        assert.notCalled(newTriggerHandler);
      });
    });
  });
});
