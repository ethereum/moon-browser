const Inferno = require("inferno");
const createClass = require("inferno-create-class");
const Moon = require("moon-lang");
const MoonSyntax = require("moon-lang/lib/moon-syntax");
const repeat = require("./../utils").repeat;

module.exports = createClass({
  getInitialState() {
    return {code: this.props.code}
  },
  componentDidMount() {
    this.renderCode();
    //this.scrollAdjuster = setInterval(() => {
      //if (this.colorTree && this.blackTree) {
        //this.colorTree.scrollTop = this.blackTree.scrollTop;
      //}
    //}, 200);
  },
  componentWillUnmount() {
    //clearInterval(this.scrollAdjuster);
  },
  componentWillReceiveProps(nextProps) {
    const changed = this.state.code !== nextProps.code;
    this.setState({code: nextProps.code});
    if (changed) {
      this.renderCode();
    }
  },
  shouldComponentUpdate() {
    return false;
  },
  edit() {
    this.colorTree.style.display = "none";
    this.blackTree.style["-webkit-text-fill-color"] = "rgb(32,36,37)";
  },
  stopEditing() {
    this.setState({code: this.blackTree.innerText});
    this.renderCode();
    this.props.onChange(this.state.code);
  },
  formatTerm(term, black) {
    var span = (color, underline, value) => {
      if (black) {
        return typeof value === "string" ? value : value.join("");
      } else {
        return <span style={{
          color: color,
          textDecoration: underline ? "underline" : "none"}}>
          {value}
        </span>;
      }
    };
    var textColors = {
      ":": "rgb(215,58,73)",
      "{": "rgb(215,58,73)",
      "}": "rgb(215,58,73)",
      "[": "rgb(215,58,73)",
      "]": "rgb(215,58,73)",
      "(": "#6f42c1",
      ")": "#6f42c1"
    };
    var formatted = MoonSyntax.termFormatter({
      indent: 1,
      maxCols: 80,
      Many: (els) => span(null, 0, els),
      Text: (text) => span(textColors[text], 0, text),
      Line: (tabs, line) => span(null, 0, [repeat(tabs, "  "), line, "\n"]),
      Var: (name) => span("#6f42c1", 0, name),
      Ref: (name) => span("rgb(3,102,214)", 1, name),
      Key: (key) => span("#647f68", 0, key),
      Str: (str) => span("#96945d", 0, str),
      Pri: (pri) => span("#7c5827", 0, pri),
      Num: (num) => span("rgb(0,92,197)", 0, num)
    })(term);
    var element = document.createElement("span");
    element.style.position = "absolute";
    element.style.width = "100%";
    element.style.overflow = "scroll";
    Inferno.render(<span>{formatted}</span>, element);
    return element;
  },
  renderCode() {
    try {
      var term = MoonSyntax.termFromString(this.state.code);
      var scrollTop = this.blackTree ? this.blackTree.scrollTop : 0;

      while (this.element.firstChild) {
        this.element.removeChild(this.element.firstChild);
      }

      this.colorTree = this.formatTerm(term, false);
      this.colorTree.style.height = (window.innerHeight - 70)+"px";
      this.colorTree.position = "relative";
      this.blackTree = this.formatTerm(term, true);
      this.blackTree.style["-webkit-text-fill-color"] = "transparent";
      this.blackTree.style.height = (window.innerHeight - 70)+"px";
      this.blackTree.contentEditable = true;
      this.blackTree.onblur = e => setTimeout(() => this.stopEditing(), 1);
      this.blackTree.position = "relative";
      this.blackTree.onscroll = e => this.colorTree.scrollTop = e.target.scrollTop;

      this.element.appendChild(this.colorTree);
      this.element.appendChild(this.blackTree);
      this.colorTree.scrollTop = scrollTop;
      this.blackTree.scrollTop = scrollTop;

    } catch (e) {
      console.log(e); // no parse, no update
    }
  },
  render() {
    return <pre
      position="relative"
      ref={e => this.element = e}
      style={{
        padding: "4px",
        width: "100%",
        height: "100%",
        fontFamily:'"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace"'
      }}
      onDblClick={e => {
        if (!this.state.editing) {
          var selected = window.getSelection().toString();
          if (selected.length > 0) {
            this.props.onLink(selected);
            e.preventDefault();
          }
        }
      }}
      onInput={e => this.edit()}>
    </pre>;
  }
});
