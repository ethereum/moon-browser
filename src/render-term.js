window.SEED = 0;
window.RNG = (N) => (SEED = (SEED * 22695477 + 1) % Math.pow(2,32), SEED % N);
setInterval(() => window.SEED = 0, 100);

const Inferno = require("inferno");
const Moon = require("moon-lang")();

module.exports = (term, path, size, appState, accounts, performIO, debug) => {
  
  const render = (term, env) => {
    if (typeof term === "string" || typeof term === "number") {
      return term;

    } else if (typeof term === "function") {
      return render(term(key => env[key]), env);

    } else if (term === null) {
      return null;

    } else if (typeof term === "object" && term.length) {
      return [].map.call(term, child => render(child, env));

    } else if (typeof term === "object") {
      const O = {};
      const box = term.box || {};
      const pos = term.pos || [0,0];
      const size = term.size || env.size;

      let newEnv = {};

      for (let key in env) {
        newEnv[key] = env[key];
      }

      if (term.name) {
        newEnv.path = env.path.concat([term.name]);
      }

      if (term.state !== undefined) {
        newEnv.state = appState[newEnv.path.join("/")] === undefined
          ? term.state
          : appState[newEnv.path.join("/")];
      }

      if (term.size) {
        newEnv.size = [term.size[0], term.size[1]];
      }

      if (box && box.borders) {
        newEnv.size[0] -= (((box.borders||O).left||O).size||0) + (((box.borders||O).right||O).size||0);
        newEnv.size[1] -= (((box.borders||O).top||O).size||0) + (((box.borders||O).bottom||O).size||0);
      }

      if (term.set) {
        for (let key in term.set) {
          newEnv[key] = term.set[key];
        }
      }

      if (term.params) {
        for (let key in term.params) {
          if (newEnv[key] === undefined) {
            newEnv[key] = term.params[key];
          }
        }
      }

      if (term.hear) {
        newEnv.yell = word => performIO(term.hear(word), env.path, env.yell);
      }

      const value = render(term.value, newEnv);

      const renderBorder = border =>
        border ? 
          (border.size||0) + "px "
          + (border.style||"") + " "
          + (border.color||"")
        : null;

      const makeEvent = (bind, key) => ev => {
        if (box[key]) {
          performIO(bind(ev, box[key]), env.path, env.yell);
          ev.stopPropagation();
        }
      };

      const mouse = (e,p) => p;
      const key = (e,p) => p({
        keyCode: e.keyCode,
        text: e.target.value
      });

      const textShadow = (box.text||O).shadow
        ? ( box.text.shadow.pos[0] + "px "
          + box.text.shadow.pos[1] + "px "
          + box.text.shadow.blur + "px "
          + box.text.shadow.color)
        : null;

      return Inferno.createVNode(2, 
        box.input ? "input" : "div",
        box.selectable ? "selectable" : "unselectable",
        box.input ? null : value,
        {
          value: box.input ? value : null,
          style: {
            position: "absolute",
            left: pos[0] + "px",
            top: pos[1] + "px",
            width: size[0] + "px",
            height: size[1] + "px",
            lineHeight: size[1] + "px",
            cursor: box.cursor,
            overflow: "hidden",
            outline: "none",
            fontSize: ((box.text||O).size || (size[1] * 0.9 || 0)) + "px",
            fontFamily: (box.text||O).font || null,
            fontWeight: (box.text||O).weight || null,
            fontStyle: (box.text||O).style || null,
            textAlign: (box.text||O).align || null,
            textShadow: textShadow,
            color: (box.text||O).color || null,
            paddingTop: ((box.paddings||O).top||0)+"px",
            paddingRight: ((box.paddings||O).right||0)+"px",
            paddingBottom: ((box.paddings||O).bottom||0)+"px",
            paddingLeft: ((box.paddings||O).left||0)+"px",
            borderTop: renderBorder((box.borders||O).top),
            borderRight: renderBorder((box.borders||O).right),
            borderBottom: renderBorder((box.borders||O).bottom),
            borderLeft: renderBorder((box.borders||O).left),
            borderRadius: box.radius ? box.radius+"px" : null,
            background: debug
              ? "rgb("+(200+RNG(55))+","+(200+RNG(55))+","+(200+RNG(55))+")"
              : box.background
          },
          onKeyPress: makeEvent(key, "onKeyPress"),
          onKeyUp: makeEvent(key, "onKeyUp"),
          onKeyDown: makeEvent(key, "onKeyDown"),
          onClick: makeEvent(mouse, "onClick"),
          onMouseDown: makeEvent(mouse, "onMouseDown"),
          onMouseUp: makeEvent(mouse, "onMouseUp")
        });
    } else {
      return "<?>";
    }
  }
  return render(term, {
    path: path,
    size: size,
    yell: w => performIO(d => e => e(0)),
    accounts: accounts
  });
};
