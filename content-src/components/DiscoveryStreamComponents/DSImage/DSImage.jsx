import {cache} from "./cache";
import React from "react";
import ReactDOM from "react-dom";

export class DSImage extends React.PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      isSeen: false,
    };
  }

  onSeen(element) {
    if (this.state && document.visibilityState === `visible` && element[0].isIntersecting) {
      if (this.props.optimize) {
        this.setState({
          containerWidth: ReactDOM.findDOMNode(this).clientWidth,
        });
      }

      this.setState({
        isSeen: true,
      });
    }
  }

  reformatImageURL(url, width) {
    const urlIsEncoded = url !== decodeURI(url);

    // Encode the URL if it needs it
    let constructedURL = urlIsEncoded ? url : encodeURIComponent(url);

    // Change the image URL to request a size tailored for the parent container width
    // Also: force JPEG, quality 60, no upscaling, no EXIF data
    // Uses Thumbor: https://thumbor.readthedocs.io/en/latest/usage.html
    constructedURL = `https://pocket-image-cache.com/${width}x0/filters:format(jpeg):quality(60):no_upscale():strip_exif()/${(constructedURL)}`;

    // Use Mozilla CDN:
    return `https://img-getpocket.cdn.mozilla.net/direct?url=${encodeURIComponent(constructedURL)}`;
  }

  componentDidMount() {
    let options = {
      root: document.querySelector(`document`),
      threshold: 1,
    };

    this.observer = new IntersectionObserver(this.onSeen.bind(this), options);

    this.observer.observe(ReactDOM.findDOMNode(this));
  }

  render() {
    const classNames = `ds-image${this.props.extraClassNames ? ` ${this.props.extraClassNames}` : ``}`;

    let img;

    if (this.state && this.state.isSeen) {
      if (this.props.optimize && this.props.rawSource) {
        let source;
        let source2x;

        if (this.state && this.state.containerWidth) {
          let baseSource = this.props.rawSource;

          source = this.reformatImageURL(
            baseSource,
            cache.query(baseSource, this.state.containerWidth, `1x`)
          );

          source2x = this.reformatImageURL(
            baseSource,
            cache.query(baseSource, this.state.containerWidth * 2, `2x`)
          );

          img = (<img src={source} srcSet={`${source2x} 2x`} />);
        }
      } else {
        img = (<img src={this.props.source} />);
      }
    }

    return (
      <picture className={classNames}>{img}</picture>
    );
  }
}

DSImage.defaultProps = {
  source: null, // The current source style from Pocket API (always 450px)
  rawSource: null, // Unadulterated image URL to filter through Thumbor
  extraClassNames: null, // Additional classnames to append to component
  optimize: true, // Measure parent container to request exact sizes
};
