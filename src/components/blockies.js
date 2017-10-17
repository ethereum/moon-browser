const urls = require("./../urls.json");
const Moon = require("moon-lang")(urls.ipfs);
const Inferno = require("inferno");
const createClass = require("inferno-create-class");
const renderTerm = require("./../render-term");

// Loads blockies app from Moon-lang
let blockiesAppCid = "zb2rhdLVJ4vfqAKdqPwydFxzYmzpiQeYERCuV9wbL51NkBMas";
let blockiesApp = null;
let forceUpdate = null;
Moon.imports(blockiesAppCid).then(blockiesAppCode => {
  blockiesApp = Moon.parse(blockiesAppCode);
  if (forceUpdate) forceUpdate();
});

module.exports = createClass({
  componentDidMount() {
    forceUpdate = () => this.forceUpdate();
  },
  render() {
    if (blockiesApp) {
      const blockiesTerm = blockiesApp(this.props.address)(8)(this.props.width/8);
      return <div style={{
        position: "absolute",
        left: "0px",
        top: "0px",
        width: this.props.width,
        height: this.props.width}}>
        {renderTerm(
          blockiesTerm,
          [],
          [this.props.width, this.props.width],
          {},
          "0x",
          ()=>{},
          false)}
      </div>;
    } else {
      return "";
    }
  }
});
