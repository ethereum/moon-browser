// TODO (in a future): migrations
const version = "0.1.4";
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
      ? <div>Use HTTPS.</div>
      : <Browser/>,
    document.getElementById("main"));
