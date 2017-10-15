const Inferno = require("inferno");
const Browser = require("./components/browser.js");

window.onload = () =>
  Inferno.render(
    <Browser/>,
    document.getElementById("main"));
