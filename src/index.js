// TODO (in a future): migrations
const version = "0.1.2";
const userVersion = window.localStorage.getItem("moonx-version");
if (userVersion !== version) {
  window.localStorage.clear();
  window.localStorage.setItem("moonx-version", version);
}

const Inferno = require("inferno");
const Browser = require("./components/browser.js");

window.onload = () =>
  Inferno.render(
    <Browser/>,
    document.getElementById("main"));
