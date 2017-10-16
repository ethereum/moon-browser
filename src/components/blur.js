const Inferno = require("inferno");

module.exports = (props) => {
  return <div
    style={{
      "-webkit-filter": "blur(4px)",
      "-moz-filter": "blur(4px)",
      "-o-filter": "blur(4px)",
      "-ms-filter": "blur(4px)",
      "filter": "blur(4px)",
      "cursor": "pointer",
      "width": "100%",
      "height": "100%"
    }}>
    {props.children}
  </div>
};

