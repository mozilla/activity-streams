import {actionCreators as ac, actionTypes as at} from "common/Actions.jsm";
import {GlobalOverrider, mountWithIntl, shallowWithIntl} from "test/unit/utils";
import {MIN_CORNER_FAVICON_SIZE, MIN_RICH_FAVICON_SIZE} from "content-src/components/TopSites/TopSitesConstants";
import {TOP_SITES_DEFAULT_ROWS, TOP_SITES_MAX_SITES_PER_ROW} from "common/Reducers.jsm";
import {TopSite, TopSiteLink, _TopSiteList as TopSiteList, TopSitePlaceholder} from "content-src/components/TopSites/TopSite";
import {FormattedMessage} from "react-intl";
import {LinkMenu} from "content-src/components/LinkMenu/LinkMenu";
import React from "react";
import {SectionMenu} from "content-src/components/SectionMenu/SectionMenu";
import {shallow} from "enzyme";
import {TopSiteForm} from "content-src/components/TopSites/TopSiteForm";
import {TopSiteFormInput} from "content-src/components/TopSites/TopSiteFormInput";
import {_TopSites as TopSites} from "content-src/components/TopSites/TopSites";

const perfSvc = {
  mark() {},
  getMostRecentAbsMarkStartByName() {}
};

const DEFAULT_PROPS = {
  TopSites: {initialized: true, rows: []},
  TopSitesRows: TOP_SITES_DEFAULT_ROWS,
  topSiteIconType: () => "no_image",
  dispatch() {},
  intl: {formatMessage: x => x},
  perfSvc
};

describe("<TopSites>", () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should render a TopSites element", () => {
    const wrapper = shallow(<TopSites {...DEFAULT_PROPS} />);
    assert.ok(wrapper.exists());
  });
  describe("context menu", () => {
    it("should render a context menu button", () => {
      const wrapper = mountWithIntl(<TopSites {...DEFAULT_PROPS} />);
      assert.equal(wrapper.find(".section-top-bar .context-menu-button").length, 1);
    });
    it("should render a section menu when button is clicked", () => {
      const wrapper = mountWithIntl(<TopSites {...DEFAULT_PROPS} />);
      const button = wrapper.find(".section-top-bar .context-menu-button");
      assert.equal(wrapper.find(SectionMenu).length, 0);
      button.simulate("click", {preventDefault: () => {}});
      assert.equal(wrapper.find(SectionMenu).length, 1);
    });
    it("should not render a section menu by default", () => {
      const wrapper = mountWithIntl(<TopSites {...DEFAULT_PROPS} />);
      assert.equal(wrapper.find(SectionMenu).length, 0);
    });
    it("should pass through the correct menu extraOptions to SectionMenu", () => {
      const wrapper = mountWithIntl(<TopSites {...DEFAULT_PROPS} />);
      wrapper.find(".section-top-bar .context-menu-button").simulate("click", {preventDefault: () => {}});
      const sectionMenuProps = wrapper.find(SectionMenu).props();
      assert.deepEqual(sectionMenuProps.extraOptions, ["AddTopSite"]);
    });
  });
  describe("#_dispatchTopSitesStats", () => {
    let globals;
    let wrapper;
    let dispatchStatsSpy;

    beforeEach(() => {
      globals = new GlobalOverrider();
      sandbox.stub(DEFAULT_PROPS, "dispatch");
      wrapper = shallow(<TopSites {...DEFAULT_PROPS} />, {disableLifecycleMethods: true});
      dispatchStatsSpy = sandbox.spy(wrapper.instance(), "_dispatchTopSitesStats");
    });
    afterEach(() => {
      globals.restore();
      sandbox.restore();
    });
    it("should call _dispatchTopSitesStats on componentDidMount", () => {
      wrapper.instance().componentDidMount();

      assert.calledOnce(dispatchStatsSpy);
    });
    it("should call _dispatchTopSitesStats on componentDidUpdate", () => {
      wrapper.instance().componentDidUpdate();

      assert.calledOnce(dispatchStatsSpy);
    });
    it("should dispatch SAVE_SESSION_PERF_DATA", () => {
      wrapper.instance()._dispatchTopSitesStats();

      assert.calledOnce(DEFAULT_PROPS.dispatch);
      assert.calledWithExactly(DEFAULT_PROPS.dispatch, ac.AlsoToMain({
        type: at.SAVE_SESSION_PERF_DATA,
        data: {
          topsites_icon_stats: {
            "screenshot_with_icon": 0,
            "screenshot": 0,
            "tippytop": 0,
            "rich_icon": 0,
            "no_image": 0
          },
          topsites_pinned: 0
        }
      }));
    });
    it("should correctly count TopSite images - just screenshot", () => {
      const rows = [{screenshot: true}];
      sandbox.stub(DEFAULT_PROPS.TopSites, "rows").value(rows);
      wrapper.instance()._dispatchTopSitesStats();

      assert.calledOnce(DEFAULT_PROPS.dispatch);
      assert.calledWithExactly(DEFAULT_PROPS.dispatch, ac.AlsoToMain({
        type: at.SAVE_SESSION_PERF_DATA,
        data: {
          topsites_icon_stats: {
            "screenshot_with_icon": 0,
            "screenshot": 1,
            "tippytop": 0,
            "rich_icon": 0,
            "no_image": 0
          },
          topsites_pinned: 0
        }
      }));
    });
    it("should correctly count TopSite images - screenshot + favicon", () => {
      const rows = [{screenshot: true, faviconSize: MIN_CORNER_FAVICON_SIZE}];
      sandbox.stub(DEFAULT_PROPS.TopSites, "rows").value(rows);
      wrapper.instance()._dispatchTopSitesStats();

      assert.calledOnce(DEFAULT_PROPS.dispatch);
      assert.calledWithExactly(DEFAULT_PROPS.dispatch, ac.AlsoToMain({
        type: at.SAVE_SESSION_PERF_DATA,
        data: {
          topsites_icon_stats: {
            "screenshot_with_icon": 1,
            "screenshot": 0,
            "tippytop": 0,
            "rich_icon": 0,
            "no_image": 0
          },
          topsites_pinned: 0
        }
      }));
    });
    it("should correctly count TopSite images - rich_icon", () => {
      const rows = [{faviconSize: MIN_RICH_FAVICON_SIZE}];
      sandbox.stub(DEFAULT_PROPS.TopSites, "rows").value(rows);
      wrapper.instance()._dispatchTopSitesStats();

      assert.calledOnce(DEFAULT_PROPS.dispatch);
      assert.calledWithExactly(DEFAULT_PROPS.dispatch, ac.AlsoToMain({
        type: at.SAVE_SESSION_PERF_DATA,
        data: {
          topsites_icon_stats: {
            "screenshot_with_icon": 0,
            "screenshot": 0,
            "tippytop": 0,
            "rich_icon": 1,
            "no_image": 0
          },
          topsites_pinned: 0
        }
      }));
    });
    it("should correctly count TopSite images - tippytop", () => {
      const rows = [{tippyTopIcon: "foo"}, {faviconRef: "tippytop"}, {faviconRef: "foobar"}];
      sandbox.stub(DEFAULT_PROPS.TopSites, "rows").value(rows);
      wrapper.instance()._dispatchTopSitesStats();

      assert.calledOnce(DEFAULT_PROPS.dispatch);
      assert.calledWithExactly(DEFAULT_PROPS.dispatch, ac.AlsoToMain({
        type: at.SAVE_SESSION_PERF_DATA,
        data: {
          topsites_icon_stats: {
            "screenshot_with_icon": 0,
            "screenshot": 0,
            "tippytop": 2,
            "rich_icon": 0,
            "no_image": 1
          },
          topsites_pinned: 0
        }
      }));
    });
    it("should correctly count TopSite images - no image", () => {
      const rows = [{}];
      sandbox.stub(DEFAULT_PROPS.TopSites, "rows").value(rows);
      wrapper.instance()._dispatchTopSitesStats();

      assert.calledOnce(DEFAULT_PROPS.dispatch);
      assert.calledWithExactly(DEFAULT_PROPS.dispatch, ac.AlsoToMain({
        type: at.SAVE_SESSION_PERF_DATA,
        data: {
          topsites_icon_stats: {
            "screenshot_with_icon": 0,
            "screenshot": 0,
            "tippytop": 0,
            "rich_icon": 0,
            "no_image": 1
          },
          topsites_pinned: 0
        }
      }));
    });
    it("should correctly count pinned Top Sites", () => {
      const rows = [{isPinned: true}, {isPinned: false}, {isPinned: true}];
      sandbox.stub(DEFAULT_PROPS.TopSites, "rows").value(rows);
      wrapper.instance()._dispatchTopSitesStats();

      assert.calledOnce(DEFAULT_PROPS.dispatch);
      assert.calledWithExactly(DEFAULT_PROPS.dispatch, ac.AlsoToMain({
        type: at.SAVE_SESSION_PERF_DATA,
        data: {
          topsites_icon_stats: {
            "screenshot_with_icon": 0,
            "screenshot": 0,
            "tippytop": 0,
            "rich_icon": 0,
            "no_image": 3
          },
          topsites_pinned: 2
        }
      }));
    });
    it("should only count visible top sites on wide layout", () => {
      globals.set("matchMedia", () => ({matches: true}));
      const rows = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}];
      sandbox.stub(DEFAULT_PROPS.TopSites, "rows").value(rows);

      wrapper.instance()._dispatchTopSitesStats();
      assert.calledOnce(DEFAULT_PROPS.dispatch);
      assert.calledWithExactly(DEFAULT_PROPS.dispatch, ac.AlsoToMain({
        type: at.SAVE_SESSION_PERF_DATA,
        data: {
          topsites_icon_stats: {
            "screenshot_with_icon": 0,
            "screenshot": 0,
            "tippytop": 0,
            "rich_icon": 0,
            "no_image": 8
          },
          topsites_pinned: 0
        }
      }));
    });
    it("should only count visible top sites on normal layout", () => {
      globals.set("matchMedia", () => ({matches: false}));
      const rows = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}];
      sandbox.stub(DEFAULT_PROPS.TopSites, "rows").value(rows);
      wrapper.instance()._dispatchTopSitesStats();
      assert.calledOnce(DEFAULT_PROPS.dispatch);
      assert.calledWithExactly(DEFAULT_PROPS.dispatch, ac.AlsoToMain({
        type: at.SAVE_SESSION_PERF_DATA,
        data: {
          topsites_icon_stats: {
            "screenshot_with_icon": 0,
            "screenshot": 0,
            "tippytop": 0,
            "rich_icon": 0,
            "no_image": 6
          },
          topsites_pinned: 0
        }
      }));
    });
  });
});

describe("<TopSiteLink>", () => {
  let link;
  beforeEach(() => {
    link = {url: "https://foo.com", screenshot: "foo.jpg", hostname: "foo"};
  });
  it("should add the right url", () => {
    link.url = "https://www.foobar.org";
    const wrapper = shallow(<TopSiteLink link={link} />);
    assert.propertyVal(wrapper.find("a").props(), "href", "https://www.foobar.org");
  });
  it("should have rtl direction automatically set for text", () => {
    const wrapper = shallow(<TopSiteLink link={link} />);

    assert.isTrue(wrapper.find("[dir='auto']").length > 0);
  });
  it("should render a title", () => {
    const wrapper = shallow(<TopSiteLink link={link} title="foobar" />);
    const titleEl = wrapper.find(".title");

    assert.equal(titleEl.text(), "foobar");
  });
  it("should have only the title as the text of the link", () => {
    const wrapper = shallow(<TopSiteLink link={link} title="foobar" />);

    assert.equal(wrapper.find("a").text(), "foobar");
  });
  it("should render the pin icon for pinned links", () => {
    link.isPinned = true;
    link.pinnedIndex = 7;
    const wrapper = shallow(<TopSiteLink link={link} />);
    assert.equal(wrapper.find(".icon-pin-small").length, 1);
  });
  it("should not render the pin icon for non pinned links", () => {
    link.isPinned = false;
    const wrapper = shallow(<TopSiteLink link={link} />);
    assert.equal(wrapper.find(".icon-pin-small").length, 0);
  });
  it("should render the first letter of the title as a fallback for missing screenshots", () => {
    const wrapper = shallow(<TopSiteLink link={link} title={"foo"} />);
    assert.equal(wrapper.find(".tile").prop("data-fallback"), "f");
  });
  it("should render a screenshot with the .active class, if it is provided", () => {
    const wrapper = shallow(<TopSiteLink link={link} />);
    const screenshotEl = wrapper.find(".screenshot");

    assert.propertyVal(screenshotEl.props().style, "backgroundImage", "url(foo.jpg)");
    assert.isTrue(screenshotEl.hasClass("active"));
  });
  it("should render a small icon with fallback letter with the screenshot if the icon is smaller than 16x16", () => {
    link.favicon = "too-small-icon.png";
    link.faviconSize = 10;
    const wrapper = shallow(<TopSiteLink link={link} title="foo" />);
    const screenshotEl = wrapper.find(".screenshot");
    const defaultIconEl = wrapper.find(".default-icon");

    assert.propertyVal(screenshotEl.props().style, "backgroundImage", "url(foo.jpg)");
    assert.isTrue(screenshotEl.hasClass("active"));
    assert.lengthOf(defaultIconEl, 1);
    assert.equal(defaultIconEl.prop("data-fallback"), "f");
  });
  it("should render a small icon with fallback letter with the screenshot if the icon is missing", () => {
    const wrapper = shallow(<TopSiteLink link={link} title="foo" />);
    const screenshotEl = wrapper.find(".screenshot");
    const defaultIconEl = wrapper.find(".default-icon");

    assert.propertyVal(screenshotEl.props().style, "backgroundImage", "url(foo.jpg)");
    assert.isTrue(screenshotEl.hasClass("active"));
    assert.lengthOf(defaultIconEl, 1);
    assert.equal(defaultIconEl.prop("data-fallback"), "f");
  });
  it("should render a small icon with the screenshot if the icon is bigger than 32x32", () => {
    link.favicon = "small-icon.png";
    link.faviconSize = 32;

    const wrapper = shallow(<TopSiteLink link={link} />);
    const screenshotEl = wrapper.find(".screenshot");
    const defaultIconEl = wrapper.find(".default-icon");

    assert.propertyVal(screenshotEl.props().style, "backgroundImage", "url(foo.jpg)");
    assert.isTrue(screenshotEl.hasClass("active"));
    assert.propertyVal(defaultIconEl.props().style, "backgroundImage", `url(${link.favicon})`);
    assert.lengthOf(wrapper.find(".rich-icon"), 0);
  });
  it("should not add the .active class to the screenshot element if no screenshot prop is provided", () => {
    link.screenshot = null;
    const wrapper = shallow(<TopSiteLink link={link} />);
    assert.isFalse(wrapper.find(".screenshot").hasClass("active"));
  });
  it("should render the tippy top icon if provided and not a small icon", () => {
    link.tippyTopIcon = "foo.png";
    link.backgroundColor = "#FFFFFF";
    const wrapper = shallow(<TopSiteLink link={link} />);
    assert.lengthOf(wrapper.find(".screenshot"), 0);
    assert.lengthOf(wrapper.find(".default-icon"), 0);
    const tippyTop = wrapper.find(".rich-icon");
    assert.propertyVal(tippyTop.props().style, "backgroundImage", "url(foo.png)");
    assert.propertyVal(tippyTop.props().style, "backgroundColor", "#FFFFFF");
  });
  it("should render a rich icon if provided and not a small icon", () => {
    link.favicon = "foo.png";
    link.faviconSize = 196;
    link.backgroundColor = "#FFFFFF";
    const wrapper = shallow(<TopSiteLink link={link} />);
    assert.lengthOf(wrapper.find(".screenshot"), 0);
    assert.lengthOf(wrapper.find(".default-icon"), 0);
    const richIcon = wrapper.find(".rich-icon");
    assert.propertyVal(richIcon.props().style, "backgroundImage", "url(foo.png)");
    assert.propertyVal(richIcon.props().style, "backgroundColor", "#FFFFFF");
  });
  it("should not render a rich icon if it is smaller than 96x96", () => {
    link.favicon = "foo.png";
    link.faviconSize = 48;
    link.backgroundColor = "#FFFFFF";
    const wrapper = shallow(<TopSiteLink link={link} />);
    assert.equal(wrapper.find(".screenshot").length, 1);
    assert.equal(wrapper.find(".rich-icon").length, 0);
  });
  it("should apply just the default class name to the outer link if props.className is falsey", () => {
    const wrapper = shallow(<TopSiteLink className={false} />);
    assert.ok(wrapper.find("li").hasClass("top-site-outer"));
  });
  it("should add props.className to the outer link element", () => {
    const wrapper = shallow(<TopSiteLink className="foo bar" />);
    assert.ok(wrapper.find("li").hasClass("top-site-outer foo bar"));
  });
  describe("#onDragEvent", () => {
    let simulate;
    let wrapper;
    beforeEach(() => {
      wrapper = shallow(<TopSiteLink isDraggable={true} onDragEvent={() => {}} />);
      simulate = type => {
        const event = {
          dataTransfer: {setData() {}, types: {includes() {}}},
          preventDefault() {
            this.prevented = true;
          },
          target: {blur() {}},
          type
        };
        wrapper.simulate(type, event);
        return event;
      };
    });
    it("should allow clicks without dragging", () => {
      simulate("mousedown");
      simulate("mouseup");

      const event = simulate("click");

      assert.notOk(event.prevented);
    });
    it("should prevent clicks after dragging", () => {
      simulate("mousedown");
      simulate("dragstart");
      simulate("dragenter");
      simulate("drop");
      simulate("dragend");
      simulate("mouseup");

      const event = simulate("click");

      assert.ok(event.prevented);
    });
    it("should allow clicks after dragging then clicking", () => {
      simulate("mousedown");
      simulate("dragstart");
      simulate("dragenter");
      simulate("drop");
      simulate("dragend");
      simulate("mouseup");
      simulate("click");

      simulate("mousedown");
      simulate("mouseup");

      const event = simulate("click");

      assert.notOk(event.prevented);
    });
  });
});

describe("<TopSite>", () => {
  let link;
  beforeEach(() => {
    link = {url: "https://foo.com", screenshot: "foo.jpg", hostname: "foo"};
  });

  it("should render a TopSite", () => {
    const wrapper = shallow(<TopSite link={link} />);
    assert.ok(wrapper.exists());
  });

  it("should render a shortened title based off the url", () => {
    link.url = "https://www.foobar.org";
    link.hostname = "foobar";
    link.eTLD = "org";
    const wrapper = shallow(<TopSite link={link} />);

    assert.equal(wrapper.find(TopSiteLink).props().title, "foobar");
  });

  it("should have .active class, on top-site-outer if context menu is open", () => {
    const wrapper = shallow(<TopSite link={link} index={1} activeIndex={1} />);
    wrapper.setState({showContextMenu: true});

    assert.equal(wrapper.find(TopSiteLink).props().className.trim(), "active");
  });
  it("should not add .active class, on top-site-outer if context menu is closed", () => {
    const wrapper = shallow(<TopSite link={link} index={1} />);
    wrapper.setState({showContextMenu: false, activeTile: 1});
    assert.equal(wrapper.find(TopSiteLink).props().className, "");
  });
  it("should render a context menu button", () => {
    const wrapper = shallow(<TopSite link={link} />);
    assert.equal(wrapper.find(".context-menu-button").length, 1);
  });
  it("should render a link menu when button is clicked", () => {
    const wrapper = shallow(<TopSite link={link} />);
    let button = wrapper.find(".context-menu-button");
    assert.equal(wrapper.find(LinkMenu).length, 0);
    button.simulate("click", {preventDefault: () => {}});
    assert.equal(wrapper.find(LinkMenu).length, 1);
  });
  it("should not render a link menu by default", () => {
    const wrapper = shallow(<TopSite link={link} />);
    assert.equal(wrapper.find(LinkMenu).length, 0);
  });
  it("should pass onUpdate, site, options, and index to LinkMenu", () => {
    const wrapper = shallow(<TopSite link={link} />);
    wrapper.find(".context-menu-button").simulate("click", {preventDefault: () => {}});
    const linkMenuProps = wrapper.find(LinkMenu).props();
    ["onUpdate", "site", "index", "options"].forEach(prop => assert.property(linkMenuProps, prop));
  });
  it("should pass through the correct menu options to LinkMenu", () => {
    const wrapper = shallow(<TopSite link={link} />);
    wrapper.find(".context-menu-button").simulate("click", {preventDefault: () => {}});
    const linkMenuProps = wrapper.find(LinkMenu).props();
    assert.deepEqual(linkMenuProps.options,
      ["CheckPinTopSite", "EditTopSite", "Separator", "OpenInNewWindow", "OpenInPrivateWindow", "Separator", "BlockUrl", "DeleteUrl"]);
  });

  describe("#trackClick", () => {
    it("should call dispatch when the link is clicked", () => {
      const dispatch = sinon.stub();
      const wrapper = shallow(<TopSite link={link} index={3} dispatch={dispatch} />);

      wrapper.find(TopSiteLink).simulate("click", {});

      assert.calledOnce(dispatch);
    });
    it("should dispatch a UserEventAction with the right data", () => {
      const dispatch = sinon.stub();
      const wrapper = shallow(<TopSite link={Object.assign({}, link, {iconType: "rich_icon", isPinned: false})} index={3} dispatch={dispatch} />);

      wrapper.find(TopSiteLink).simulate("click", {});

      const [action] = dispatch.firstCall.args;
      assert.isUserEventAction(action);

      assert.propertyVal(action.data, "event", "CLICK");
      assert.propertyVal(action.data, "source", "TOP_SITES");
      assert.propertyVal(action.data, "action_position", 3);
      assert.propertyVal(action.data.value, "is_pinned", false);
      assert.propertyVal(action.data.value, "icon_type", "rich_icon");
    });
  });
});

describe("<TopSiteForm>", () => {
  let wrapper;
  let sandbox;

  function setup(props = {}) {
    sandbox = sinon.sandbox.create();
    const customProps = Object.assign({}, {onClose: sandbox.spy(), dispatch: sandbox.spy()}, props);
    wrapper = mountWithIntl(<TopSiteForm {...customProps} />);
  }

  describe("validateForm", () => {
    beforeEach(() => setup({site: {url: "http://foo"}}));

    it("should return true for a correct URL", () => {
      wrapper.setState({url: "foo"});

      assert.isTrue(wrapper.instance().validateForm());
    });

    it("should return false for a incorrect URL", () => {
      wrapper.setState({url: " "});

      assert.isFalse(wrapper.instance().validateForm());
      assert.isTrue(wrapper.state().validationError);
    });
  });

  describe("#addMode", () => {
    beforeEach(() => setup());

    it("should render the component", () => {
      assert.ok(wrapper.find(TopSiteForm));
    });
    it("should have the correct header", () => {
      assert.equal(wrapper.findWhere(n => n.length && n.props().id === "topsites_form_add_header").length, 1);
    });
    it("should have the correct button text", () => {
      assert.equal(wrapper.findWhere(n => n.length && n.props().id === "topsites_form_save_button").length, 0);
      assert.equal(wrapper.findWhere(n => n.length && n.props().id === "topsites_form_add_button").length, 1);
    });
    it("should call onClose if Cancel button is clicked", () => {
      wrapper.find(".cancel").simulate("click");
      assert.calledOnce(wrapper.instance().props.onClose);
    });
    it("should show error and not call onClose or dispatch if URL is empty", () => {
      assert.isFalse(wrapper.state().validationError);
      wrapper.find(".done").simulate("click");
      assert.isTrue(wrapper.state().validationError);
      assert.notCalled(wrapper.instance().props.onClose);
      assert.notCalled(wrapper.instance().props.dispatch);
    });
    it("should show error and not call onClose or dispatch if URL is invalid", () => {
      wrapper.setState({"url": "not valid"});
      assert.isFalse(wrapper.state().validationError);
      wrapper.find(".done").simulate("click");
      assert.isTrue(wrapper.state().validationError);
      assert.notCalled(wrapper.instance().props.onClose);
      assert.notCalled(wrapper.instance().props.dispatch);
    });
    it("should call onClose and dispatch with right args if URL is valid", () => {
      wrapper.setState({"url": "valid.com", "label": "a label"});
      wrapper.find(".done").simulate("click");
      assert.calledOnce(wrapper.instance().props.onClose);
      assert.calledWith(
        wrapper.instance().props.dispatch,
        {
          data: {site: {label: "a label", url: "http://valid.com"}, index: -1},
          meta: {from: "ActivityStream:Content", to: "ActivityStream:Main"},
          type: at.TOP_SITES_PIN
        }
      );
      assert.calledWith(
        wrapper.instance().props.dispatch,
        {
          data: {action_position: -1, source: "TOP_SITES", event: "TOP_SITES_EDIT"},
          meta: {from: "ActivityStream:Content", to: "ActivityStream:Main"},
          type: at.TELEMETRY_USER_EVENT
        }
      );
    });
    it("should not pass empty string label in dispatch data", () => {
      wrapper.setState({"url": "valid.com", "label": ""});
      wrapper.find(".done").simulate("click");
      assert.calledWith(
        wrapper.instance().props.dispatch,
        {
          data: {site: {url: "http://valid.com"}, index: -1},
          meta: {from: "ActivityStream:Content", to: "ActivityStream:Main"},
          type: at.TOP_SITES_PIN
        }
      );
    });
  });

  describe("edit existing Topsite", () => {
    beforeEach(() => setup({site: {url: "https://foo.bar", label: "baz"}, index: 0}));

    it("should render the component", () => {
      assert.ok(wrapper.find(TopSiteForm));
    });
    it("should have the correct header", () => {
      assert.equal(wrapper.findWhere(n => n.props().id === "topsites_form_edit_header").length, 1);
    });
    it("should have the correct button text", () => {
      assert.equal(wrapper.findWhere(n => n.props().id === "topsites_form_add_button").length, 0);
      assert.equal(wrapper.findWhere(n => n.props().id === "topsites_form_save_button").length, 1);
    });
    it("should have the correct button text (if editing a placeholder)", () => {
      wrapper.setProps({site: null});

      assert.equal(wrapper.findWhere(n => n.props().id === "topsites_form_save_button").length, 0);
      assert.equal(wrapper.findWhere(n => n.props().id === "topsites_form_add_button").length, 1);
    });
    it("should call onClose if Cancel button is clicked", () => {
      wrapper.find(".cancel").simulate("click");
      assert.calledOnce(wrapper.instance().props.onClose);
    });
    it("should show error and not call onClose or dispatch if URL is empty", () => {
      wrapper.setState({"url": ""});
      assert.isFalse(wrapper.state().validationError);
      wrapper.find(".done").simulate("click");
      assert.isTrue(wrapper.state().validationError);
      assert.notCalled(wrapper.instance().props.onClose);
      assert.notCalled(wrapper.instance().props.dispatch);
    });
    it("should show error and not call onClose or dispatch if URL is invalid", () => {
      wrapper.setState({"url": "not valid"});
      assert.isFalse(wrapper.state().validationError);
      wrapper.find(".done").simulate("click");
      assert.isTrue(wrapper.state().validationError);
      assert.notCalled(wrapper.instance().props.onClose);
      assert.notCalled(wrapper.instance().props.dispatch);
    });
    it("should call onClose and dispatch with right args if URL is valid", () => {
      wrapper.find(".done").simulate("click");
      assert.calledOnce(wrapper.instance().props.onClose);
      assert.calledTwice(wrapper.instance().props.dispatch);
      assert.calledWith(
        wrapper.instance().props.dispatch,
        {
          data: {site: {label: "baz", url: "https://foo.bar"}, index: 0},
          meta: {from: "ActivityStream:Content", to: "ActivityStream:Main"},
          type: at.TOP_SITES_PIN
        }
      );
      assert.calledWith(
        wrapper.instance().props.dispatch,
        {
          data: {action_position: 0, source: "TOP_SITES", event: "TOP_SITES_EDIT"},
          meta: {from: "ActivityStream:Content", to: "ActivityStream:Main"},
          type: at.TELEMETRY_USER_EVENT
        }
      );
    });
    it("should call onClose and dispatch with right args if URL is valid (negative index)", () => {
      wrapper.setProps({index: -1});
      wrapper.find(".done").simulate("click");
      assert.calledOnce(wrapper.instance().props.onClose);
      assert.calledTwice(wrapper.instance().props.dispatch);
      assert.calledWith(
        wrapper.instance().props.dispatch,
        {
          data: {site: {label: "baz", url: "https://foo.bar"}, index: -1},
          meta: {from: "ActivityStream:Content", to: "ActivityStream:Main"},
          type: at.TOP_SITES_PIN
        }
      );
    });
    it("should not pass empty string label in dispatch data", () => {
      wrapper.setState({"label": ""});
      wrapper.find(".done").simulate("click");
      assert.calledWith(
        wrapper.instance().props.dispatch,
        {
          data: {site: {url: "https://foo.bar"}, index: 0},
          meta: {from: "ActivityStream:Content", to: "ActivityStream:Main"},
          type: at.TOP_SITES_PIN
        }
      );
    });
  });

  describe("#validateUrl", () => {
    it("should properly validate URLs", () => {
      setup();
      assert.ok(wrapper.instance().validateUrl("mozilla.org"));
      assert.ok(wrapper.instance().validateUrl("https://mozilla.org"));
      assert.ok(wrapper.instance().validateUrl("http://mozilla.org"));
      assert.ok(wrapper.instance().validateUrl("https://mozilla.invisionapp.com/d/main/#/projects/prototypes"));
      assert.ok(wrapper.instance().validateUrl("httpfoobar"));
      assert.ok(wrapper.instance().validateUrl("httpsfoo.bar"));
      assert.isFalse(wrapper.instance().validateUrl("mozilla org"));
      assert.isFalse(wrapper.instance().validateUrl(""));
    });
  });

  describe("#cleanUrl", () => {
    it("should properly prepend http:// to URLs when required", () => {
      setup();
      assert.equal("http://mozilla.org", wrapper.instance().cleanUrl("mozilla.org"));
      assert.equal("http://https.org", wrapper.instance().cleanUrl("https.org"));
      assert.equal("http://httpcom", wrapper.instance().cleanUrl("httpcom"));
      assert.equal("http://mozilla.org", wrapper.instance().cleanUrl("http://mozilla.org"));
      assert.equal("https://firefox.com", wrapper.instance().cleanUrl("https://firefox.com"));
    });
  });
});

describe("<TopSiteList>", () => {
  it("should render a TopSiteList element", () => {
    const wrapper = shallow(<TopSiteList {...DEFAULT_PROPS} />);
    assert.ok(wrapper.exists());
  });
  it("should render a TopSite for each link with the right url", () => {
    const rows = [{url: "https://foo.com"}, {url: "https://bar.com"}];
    const wrapper = shallow(<TopSiteList {...DEFAULT_PROPS} TopSites={{rows}} />);
    const links = wrapper.find(TopSite);
    assert.lengthOf(links, 2);
    rows.forEach((row, i) => assert.equal(links.get(i).props.link.url, row.url));
  });
  it("should slice the TopSite rows to the TopSitesRows pref", () => {
    const rows = [];
    for (let i = 0; i < TOP_SITES_DEFAULT_ROWS * TOP_SITES_MAX_SITES_PER_ROW + 3; i++) {
      rows.push({url: `https://foo${i}.com`});
    }
    const wrapper = shallow(<TopSiteList {...DEFAULT_PROPS} TopSites={{rows}} TopSitesRows={TOP_SITES_DEFAULT_ROWS} />);
    const links = wrapper.find(TopSite);
    assert.lengthOf(links, TOP_SITES_DEFAULT_ROWS * TOP_SITES_MAX_SITES_PER_ROW);
  });
  it("should fill with placeholders if TopSites rows is less than TopSitesRows", () => {
    const rows = [{url: "https://foo.com"}, {url: "https://bar.com"}];
    const wrapper = shallow(<TopSiteList {...DEFAULT_PROPS} TopSites={{rows}} TopSitesRows={1} />);
    assert.lengthOf(wrapper.find(TopSite), 2, "topSites");
    assert.lengthOf(wrapper.find(TopSitePlaceholder), TOP_SITES_MAX_SITES_PER_ROW - 2, "placeholders");
  });
  it("should fill any holes in TopSites with placeholders", () => {
    const rows = [{url: "https://foo.com"}];
    rows[3] = {url: "https://bar.com"};
    const wrapper = shallow(<TopSiteList {...DEFAULT_PROPS} TopSites={{rows}} TopSitesRows={1} />);
    assert.lengthOf(wrapper.find(TopSite), 2, "topSites");
    assert.lengthOf(wrapper.find(TopSitePlaceholder), TOP_SITES_MAX_SITES_PER_ROW - 2, "placeholders");
  });
  it("should update state onDragStart and clear it onDragEnd", () => {
    const wrapper = shallow(<TopSiteList {...DEFAULT_PROPS} />);
    const instance = wrapper.instance();
    const index = 7;
    const link = {url: "https://foo.com"};
    const title = "foo";
    instance.onDragEvent({type: "dragstart"}, index, link, title);
    assert.equal(instance.state.draggedIndex, index);
    assert.equal(instance.state.draggedSite, link);
    assert.equal(instance.state.draggedTitle, title);
    instance.onDragEvent({type: "dragend"});
    assert.deepEqual(instance.state, TopSiteList.DEFAULT_STATE);
  });
  it("should clear state when new props arrive after a drop", () => {
    const site1 = {url: "https://foo.com"};
    const site2 = {url: "https://bar.com"};
    const rows = [site1, site2];
    const wrapper = shallow(<TopSiteList {...DEFAULT_PROPS} TopSites={{rows}} />);
    const instance = wrapper.instance();
    instance.setState({
      draggedIndex: 1,
      draggedSite: site2,
      draggedTitle: "bar",
      topSitesPreview: []
    });
    wrapper.setProps({TopSites: {rows: [site2, site1]}});
    assert.deepEqual(instance.state, TopSiteList.DEFAULT_STATE);
  });
  it("should dispatch events on drop", () => {
    const dispatch = sinon.spy();
    const wrapper = shallow(<TopSiteList {...DEFAULT_PROPS} dispatch={dispatch} />);
    const instance = wrapper.instance();
    const index = 7;
    const link = {url: "https://foo.com"};
    const title = "foo";
    instance.onDragEvent({type: "dragstart"}, index, link, title);
    dispatch.reset();
    instance.onDragEvent({type: "drop"}, 3);
    assert.calledTwice(dispatch);
    assert.calledWith(dispatch, {
      data: {draggedFromIndex: 7, index: 3, site: {label: "foo", url: "https://foo.com"}},
      meta: {from: "ActivityStream:Content", to: "ActivityStream:Main"},
      type: "TOP_SITES_INSERT"
    });
    assert.calledWith(dispatch, {
      data: {action_position: 3, event: "DROP", source: "TOP_SITES"},
      meta: {from: "ActivityStream:Content", to: "ActivityStream:Main"},
      type: "TELEMETRY_USER_EVENT"
    });
  });
  it("should make a topSitesPreview onDragEnter", () => {
    const wrapper = shallow(<TopSiteList {...DEFAULT_PROPS} />);
    const instance = wrapper.instance();
    const site = {url: "https://foo.com"};
    instance.setState({
      draggedIndex: 4,
      draggedSite: site,
      draggedTitle: "foo"
    });
    const draggedSite = Object.assign({}, site, {isPinned: true, isDragged: true});
    instance.onDragEvent({type: "dragenter"}, 2);
    assert.ok(instance.state.topSitesPreview);
    assert.deepEqual(instance.state.topSitesPreview[2], draggedSite);
  });
  it("should _makeTopSitesPreview correctly", () => {
    const site1 = {url: "https://foo.com"};
    const site2 = {url: "https://bar.com"};
    const site3 = {url: "https://baz.com"};
    const rows = [site1, site2, site3];
    let wrapper = shallow(<TopSiteList {...DEFAULT_PROPS} TopSites={{rows}} TopSitesRows={1} />);
    let instance = wrapper.instance();
    instance.setState({
      draggedIndex: 0,
      draggedSite: site1,
      draggedTitle: "foo"
    });
    let draggedSite = Object.assign({}, site1, {isPinned: true, isDragged: true});
    assert.deepEqual(instance._makeTopSitesPreview(1), [site2, draggedSite, site3, null, null, null, null, null]);
    assert.deepEqual(instance._makeTopSitesPreview(2), [site2, site3, draggedSite, null, null, null, null, null]);
    assert.deepEqual(instance._makeTopSitesPreview(3), [site2, site3, null, draggedSite, null, null, null, null]);
    site2.isPinned = true;
    assert.deepEqual(instance._makeTopSitesPreview(1), [site2, draggedSite, site3, null, null, null, null, null]);
    assert.deepEqual(instance._makeTopSitesPreview(2), [site3, site2, draggedSite, null, null, null, null, null]);
    site3.isPinned = true;
    assert.deepEqual(instance._makeTopSitesPreview(1), [site2, draggedSite, site3, null, null, null, null, null]);
    assert.deepEqual(instance._makeTopSitesPreview(2), [site2, site3, draggedSite, null, null, null, null, null]);
    site2.isPinned = false;
    assert.deepEqual(instance._makeTopSitesPreview(1), [site2, draggedSite, site3, null, null, null, null, null]);
    assert.deepEqual(instance._makeTopSitesPreview(2), [site2, site3, draggedSite, null, null, null, null, null]);
    site3.isPinned = false;
    instance.setState({
      draggedIndex: 1,
      draggedSite: site2,
      draggedTitle: "bar"
    });
    draggedSite = Object.assign({}, site2, {isPinned: true, isDragged: true});
    assert.deepEqual(instance._makeTopSitesPreview(0), [draggedSite, site1, site3, null, null, null, null, null]);
    assert.deepEqual(instance._makeTopSitesPreview(2), [site1, site3, draggedSite, null, null, null, null, null]);
  });
  it("should add a className hide-for-narrow to sites after 6/row", () => {
    const rows = [];
    for (let i = 0; i < TOP_SITES_MAX_SITES_PER_ROW; i++) {
      rows.push({url: `https://foo${i}.com`});
    }
    const wrapper = mountWithIntl(<TopSiteList {...DEFAULT_PROPS} TopSites={{rows}} TopSitesRows={1} />);
    assert.lengthOf(wrapper.find("li.hide-for-narrow"), 2);
  });
});

describe("TopSitePlaceholder", () => {
  it("should dispatch a TOP_SITES_EDIT action when edit-button is clicked", () => {
    const dispatch = sinon.spy();
    const wrapper =
      shallowWithIntl(<TopSitePlaceholder dispatch={dispatch} index={7} />);

    wrapper.find(".edit-button").first().simulate("click");

    assert.calledOnce(dispatch);
    assert.calledWithExactly(dispatch,
      {type: at.TOP_SITES_EDIT, data: {index: 7}});
  });
});

describe("#TopSiteFormInput", () => {
  let wrapper;
  let onChangeStub;

  describe("no errors", () => {
    beforeEach(() => {
      onChangeStub = sinon.stub();

      wrapper = mountWithIntl(<TopSiteFormInput titleId="topsites_form_title_label"
        placeholderId="topsites_form_title_placeholder"
        errorMessageId="topsites_form_url_validation"
        onChange={onChangeStub}
        value="foo" />);
    });

    it("should render the provided title", () => {
      const title = wrapper.find(FormattedMessage);

      assert.propertyVal(title.props(), "id", "topsites_form_title_label");
    });

    it("should render the provided value", () => {
      const input = wrapper.find("input");

      assert.equal(input.getDOMNode().value, "foo");
    });

    it("should render the clear button if cb is provided", () => {
      assert.equal(wrapper.find(".icon-clear-input").length, 0);

      wrapper.setProps({onClear: sinon.stub()});

      assert.equal(wrapper.find(".icon-clear-input").length, 1);
    });
  });

  describe("with error", () => {
    beforeEach(() => {
      onChangeStub = sinon.stub();

      wrapper = mountWithIntl(<TopSiteFormInput titleId="topsites_form_title_label"
        placeholderId="topsites_form_title_placeholder"
        onChange={onChangeStub}
        validationError={true}
        errorMessageId="topsites_form_url_validation"
        value="foo" />);
    });

    it("should render the error message", () => {
      assert.equal(wrapper.findWhere(n => n.props().id === "topsites_form_url_validation").length, 1);
    });
  });
});
