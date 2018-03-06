// TODO (in a future): migrations
const version = "0.1.6";
const userVersion = window.localStorage.getItem("moonx-version");
if (userVersion !== version) {
  window.localStorage.clear();
  window.localStorage.setItem("moonx-version", version);
}

const Inferno = require("inferno");
const Browser = require("./components/browser.js");

window.onload = () =>
  Inferno.render(
    !window.crypto.subtle
      ? <div>window.crypto.suble not found</div>
      : <Browser/>,
    document.getElementById("main"));
