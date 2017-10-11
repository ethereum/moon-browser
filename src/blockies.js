const urls = require("./urls.json");
const Moon = require("moon-lang")(urls.ipfs);
const Inferno = require("inferno");
const createClass = require("inferno-create-class");
const renderTerm = require("./render-term");
const blockiesAppCid = "zb2rhe7DnDFA13zHnhUGUjBn7nMuDhyxbdgCds24WnR9Dc2G7";
let blockiesApp = null;
Moon.imports(blockiesAppCid).then(blockiesAppCode => {
  blockiesApp = Moon.parse(blockiesAppCode);
});

module.exports = createClass({
  render() {
    if (blockiesApp) {
      const blockiesTerm = blockiesApp(this.props.address)(8)(this.props.width/8);
      return <div style={{
        position: "relative",
        width: this.props.width,
        height: this.props.width}}>
        {renderTerm(blockiesTerm, [], [this.props.width,this.props.width], [], ()=>{}, false)}
      </div>;
    } else {
      return "X";
    }
  }
});

