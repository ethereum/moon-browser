const Inferno = require("inferno");

module.exports = (props) => {
  return <div
    style={{
      position: "fixed",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      height: "100%",
      zIndex: 10,
      cursor: "pointer"
    }}
    onClick={() => props.onClose()}>
    <div
      style={{
        cursor: "auto",
        zIndex: 20,
        padding: "9px 16px",
        background: "rgba(241,241,241,0.95)",
        border: "1px solid rgb(227,227,227)",
        borderRadius: "3px",
        boxShadow: "0px 0px 1px rgb(99,99,99), 0px 0px 10px rgba(99,99,99, 0.4)",
        "-webkit-backdrop-filter": "blur(50px) brightness(110%)"
      }}
      onClick={e => e.stopPropagation()}>
      {props.children}
    </div>
  </div>;
};
