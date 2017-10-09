const Inferno = require("inferno");
const createClass = require("inferno-create-class");
const Moon = require("moon-lang");
const MoonSyntax = require("moon-lang/lib/moon-syntax");

module.exports = createClass({
  getInitialState() {
    return {
      code: this.props.code,
      caretPosition: 0,
      editing: false
    }
  },
  componentDidMount() {
    this.renderCode();
  },
  componentWillReceiveProps(nextProps) {
    if (this.state.code === nextProps.code && window.getSelection().anchorOffset === 0) {
      this.setState({code: nextProps.code, editing: false});
      this.renderCode();
    }
  },
  shouldComponentUpdate() {
    return false;
  },
  edit() {
    this.colorTree.style.display = "none";
    this.blackTree.style["-webkit-text-fill-color"] = "rgb(32,36,37)";
    this.setState({
      code: this.blackTree.innerText,
      caretPosition: window.getSelection().focusOffset,
      editing: true
    });
  },
  stopEditing() {
    this.props.onChange(this.state.code);
  },
  renderCode() {
    //console.log("render", this.state.stale);
    //if (!this.state.stale) {
      //return;
    //}
    try {
      var formatTerm = (term, black) => {
        var repeat = (n, s) =>
          n === 0 ? "" : s + repeat(n-1, s);
        var dec = (col, underline, val) =>
          black
            ? (typeof val === "string" ? val : val.join(""))
            : <span style={{
              color: col,
              textDecoration: underline ? "underline" : "none"}}>
              {val}
            </span>;
        var textCols = {
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
          Many: (els) => dec(null, 0, els),
          Text: (text) => dec(textCols[text], 0, text),
          Line: (tabs, line) => dec(null, 0, [repeat(tabs, "  "), line, "\n"]),
          Var: (name) => dec("#6f42c1", 0, name),
          Ref: (name) => dec("rgb(3,102,214)", 1, name),
          Key: (key) => dec("#647f68", 0, key),
          Str: (str) => dec("#96945d", 0, str),
          Pri: (pri) => dec("#7c5827", 0, pri),
          Num: (num) => dec("rgb(0,92,197)", 0, num)
        })(term);
        var element = document.createElement("span");
        element.style.position = "absolute";
        Inferno.render(<span>{formatted}</span>, element);
        return element;
      }

      var term = MoonSyntax.termFromString(this.state.code);

      while (this.element.firstChild) {
        this.element.removeChild(this.element.firstChild);
      }

      this.colorTree = formatTerm(term, false);
      this.colorTree.style.height = (window.innerHeight - 70)+"px";
      this.colorTree.style.overflow = "scroll";
      this.colorTree.style.paddingRight = "32px";
      this.blackTree = formatTerm(term, true);
      this.blackTree.style["-webkit-text-fill-color"] = "transparent";
      this.blackTree.style.paddingRight = "32px";
      this.blackTree.style.overflow = "scroll";
      this.blackTree.style.height = (window.innerHeight - 70)+"px";
      this.blackTree.contentEditable = true;
      this.blackTree.onblur = e => setTimeout(() => this.stopEditing(), 1);
      this.blackTree.onscroll = e => this.colorTree.scrollTop = e.target.scrollTop;

      this.element.appendChild(this.colorTree);
      this.element.appendChild(this.blackTree);

    } catch (e) {
      console.log(e); // no parse, no update
    }
  },
  render() {
    return <pre
      position="relative"
      ref={e => this.element = e}
      style={{
        padding: "0px",
        fontFamily:'"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace"'}}
      onKeyDown={e => {
        if (e.keyCode === 13) { // enter
          this.stopEditing();
          e.preventDefault();
        }
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
