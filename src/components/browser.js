const urls = require("./../urls.json");
const Eth = require("eth-lib");
const Moon = require("moon-lang")(urls.ipfs);
const performIO = require("./../perform-io");
const rpc = Eth.rpc(urls.ethereum.mainnet);
const Inferno = require("inferno");
const Editor = require("./editor");
const createClass = require("inferno-create-class");
const renderTerm = require("./../render-term");
const {merge, memoizeAsync, zipWith} = require("./../utils");
const Blockies = require("./blockies");
const Blur = require("./blur");
const SelectAccount = require("./selectAccount");

// Temporary hack for debugging
window.reset = () => window.localStorage.removeItem("mist-lite-data");

// Todo: break into smaller components
module.exports = createClass({

  // Lifecycle

  getInitialState() {
    this.activeAppData = {};
    this.activeAppDataNonce = 0;
    this.localDataKey = "mist-lite-data";
    this.homeAppCid = "zb2rhmqj5QpYzhL3DXGBfJDMrX1cwmNHh6SQ7zbgachqenNqp";
    this.walletAppCid = "zb2rhiEPfhBsR32LFRVkuSYeEKtwQiB2uiQcJsBityDGKazN9";

    window.acc = pvt => {
      const acc = Eth.account.fromPrivate(pvt);
      this.setState({
        activeAccount: acc.address,
        accounts: {[acc.address]: this.initAccount(acc)}
      });
    };

    const localData = JSON.parse(window.localStorage.getItem(this.localDataKey));

    return localData || (() => {
      const firstAccount = Eth.account.create();
      return {
        activeAppHistory: [this.homeAppCid],
        appState: {},
        showModal: false,
        mode: "play",
        debug: false,
        activeAccount: firstAccount.address,
        accounts: {
          [firstAccount.address]: this.initAccount(firstAccount)
        }
      };
    })();
  },

  componentDidMount() {
    this.firstRefreshTimeout = setTimeout(() => this.refreshApp());
    this.fetchEthereumData();
    this.fetchEthereumDataTimer = setInterval(() => this.fetchEthereumData(), 30000);
    this.stateSaverInterval = setInterval(() => this.saveState(), 1500);
    window.addEventListener("resize", () => {
      if (this.resizeTimer) clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => this.forceUpdate(), 250);
    });
  },

  componentWillUnmount() {
    clearTimeout(this.firstRefreshTimeout);
    clearInterval(this.fetchEthereumDataTimer);
    clearInterval(this.stateSaverInterval);
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
  },

  saveState() {
    window.localStorage.setItem(this.localDataKey, JSON.stringify(this.state));
  },


  // Fetches:
  // - account balances
  fetchEthereumData() {
    const addresses = Object.keys(this.state.accounts);
    const getBalance = address => rpc("eth_getBalance", [address, "latest"]);
    const balances = Promise.all(addresses.map(getBalance));
    balances.then(balances => {
      const addBalance = (address, balance) => merge(this.getAccount(address), {balance});
      const accountsArray = Promise.all(zipWith(addresses, balances, addBalance));
      accountsArray.then(accountsArray => {
        let accounts = {};
        accountsArray.forEach(account => accounts[account.address] = account);
        this.setState({accounts});
      });
    });
  },

  getAccount(address) {
    return this.state.accounts[address];
  },

  initAccount(account) {
    return merge(account, {
      type: "privateKey",
      balance: null
    });
  },

  addAccount(account) {
    this.setState({
      accounts: merge(
        this.state.accounts,
        {[account.address]: this.initAccount(account)})
    });
    this.fetchEthereumData();
  },

  getAccounts() {
    return Object.keys(this.state.accounts).map(address => {
      return {
        address: address,
        balance: this.getAccountBalance(this.getAccount(address))
      };
    })
  },

  getActiveAccount() {
    return this.getAccount(this.state.activeAccount);
  },

  setActiveAccount(address) {
    this.setState({activeAccount: address});
  },

  getAccountBalance(account) {
    return account.balance ? Eth.nat.toEther(account.balance) : 0;
  },

  getAccountBalanceString(account) {
    const balance = this.getAccountBalance(account);
    return balance ? balance.toFixed(2) : "2";
  },



  // App methods
  getActiveAppName(state) {
    return (state || this.state).activeAppHistory[(state || this.state).activeAppHistory.length - 1];
  },

  setActiveApp(name) {
    if (name !== this.getActiveAppName()) {
      console.log("-> Setting active app to: " + name);
      Moon.load(name).then(code => {
        console.log("-> Loaded code. Importing dependencies.");
        if (this.activeAppData.code !== code) {
          this.state.activeAppHistory.push(name);
        }
        const newState = merge(this.state, {activeAppHistory: this.state.activeAppHistory});
        const activeApp = this.getActiveAppName(newState);
        const invalid = () => ({type:"txt", value:"<invalid-term>"});
        const term = Moon.imports(activeApp)
          .then(imported => {
            console.log("-> Imported " + imported.length + " chars. Parsing...");
            return Moon.parse(imported, {fast:1});
          })
          .catch(invalid);
        const nonce = this.activeAppDataNonce++;
        return term.then(term => {
          console.log("-> Code parsed. Initializing DApp...");
          if (nonce + 1 === this.activeAppDataNonce) { // avoids front running
            this.activeAppData = {code, term};
            this.setState(newState);
            this.forceUpdate();
          }
        });
      }).catch(()=>{});
    };
  },

  setActiveCode(code) {
    try {
      Moon.cid(code).then(cid => {
        if (!localStorage.getItem("mist-lite-saved-" + cid)) {
          Moon.save(code).then(cid => localStorage.setItem("mist-lite-saved-" + cid, "1"));
        }
        localStorage.setItem("mist-lite-"+cid, Moon.pack(code));
        this.setActiveApp(cid);
      });
    } catch(e) {
      // OK: just bad code on editor, do nothing
    }
  },

  refreshApp() {
    this.setActiveApp(this.state.activeAppHistory.pop());
  },

  renderApp({code, term, state}) {
    if (!code) {
      return <div>Loading app...</div>;

    } else if (this.state.mode === "edit") {
      return <Editor
        onChange={code => {
          this.setActiveCode(code);
        }}
        onLink={name => {
          this.setActiveApp(name);
        }}
        code={code}/>;

    } else {
      const {width, height} = this.mainport.getBoundingClientRect();
      //console.log("st ->",JSON.stringify(this.state.appState, null, 2));
      //console.log("\n");
      return <div className="renderedApp" style={{position:"relative", height:"100%", width:"100%"}}>
        {renderTerm(
          term,
          [],
          [width, height],
          this.state.appState,
          this.getActiveAccount().address,
          this.performIO,
          this.state.debug)
        }
      </div>;

    }
  },

  performIO(program, baseState, path, yell) {
    return performIO(this, program, baseState, path, yell);
  },


  // Browsing
  goBack() {
    if (this.state.activeAppHistory.length > 1) {
      this.state.activeAppHistory.pop();
      this.refreshApp();
    }
  },

  // Browsing
  goForward() {
    // TODO
  },

  toggleMode() {
    this.setState({mode:({play:"edit",edit:"play"})[this.state.mode]});
  },

  downloadApp() {
    // TODO
  },

  toggleShowAccountList() {
    this.setState({showModal: !this.state.showModal});
  },

  toggleDebug() {
    this.setState({debug: !this.state.debug});
  },



  // Render

  render() {
    if (!this.state) {
      return <div>Loading...</div>;
    }

    // Useful data
    const activeAccount = this.getActiveAccount();
    const canGoBack = this.state.activeAppHistory.length <= 1;

    // Get appropriate colors
    const appBackground = (((this.activeAppData||{}).term||{}).title||{}).background || [241,241,241];
    const titleBackground = typeof appBackground == "object" ? "rgb(" + appBackground.join(",") + ")" : "#f1f1f1";
    const isDarkTitleBar = (typeof appBackground == "object" && appBackground.length == 3 && (2 * appBackground[0] + appBackground[1] + 3 * appBackground[2]) < 3 * 256);
    const buttonColor = isDarkTitleBar ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.6)";
    const buttonShadows = isDarkTitleBar ? "rgba(0, 0, 0, 0.5) 0 -1px 0" : "rgba(255, 255, 255, 0.5) 0 1px 0";

    // The DApp title
    const title = <span style={{
      fontSize: "14px",
      fontWeight: "600",
      fontFamily: "helvetica",
      textShadow: buttonShadows,
      color: buttonColor}}>
      {(((this.activeAppData||{}).term||{}).title||{}).text || "Welcome to Moon!"}
    </span>;

    // The URL input displayed on top
    const urlBar = <input
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
      style={{
        display: "inline-block",
        border: "0px solid white",
        color: buttonColor,
        margin: "0px 4px",
        padding: "4px",
        width: Math.min(window.innerWidth - 160, 416) + "px",
        textOverflow: "ellipsis",
        height: "24px",
        fontSize: "12px",
        textAlign: "center",
      }}
      onInput={e => this.setActiveApp(e.target.value)}
      value={this.getActiveAppName()}/>;

    // The (...) options for the app
    //const optionsButtonStyle = {
      //fontSize: "18px",
      //fontWeight: "bold",
      //paddingTop: "0px"
    //};
    //const optionsButtonEffect = e => { this.toggleDebug(); e.stopPropagation() };
    //const optionsButton = Button("⋮", optionsButtonStyle, optionsButtonEffect);

    // Title
    const titleUrlBar = <div className="titleUrl"
      style={{
        display: "inline-block",
        verticalAlign: "top",
        marginTop: "20px"
      }}>
      <div>{title}</div>
      <div>{urlBar}</div>
    </div>;

    // Component for a top-bar button
    const Button = (align, icon, onClick) =>
      <span
        className="button unselectable"
        style={{
          display: "inline-block",
          position: "relative",
          cursor: "pointer",
          width: "32px",
          height: "70px",
          fontSize: "14px",
          float: align,
          fontFamily: "icomoon"
        }}
        onClick={(e) => { onClick(e); e.stopPropagation() }}>
      {typeof icon === "string"
        ?  <div
          style={{
            display: "inline-block",
            position: "absolute",
            left: "0px",
            top: "32px",
            width:"30px",
            fontSize: "24px",
            textShadow: buttonShadows,
            color: buttonColor
          }}> {icon} </div>
        : icon}
      </span>;

      // other ways to add this: &#xe90e; {{icon}} &#x{{icon}}

    // Tabs button
    const tabsButton = Button("left", "", () => this.setActiveApp(this.walletAppCid));

    // Button to go back
    const backButton = Button("left", "", () => this.goBack());

    // Button to go forward
    const forwardButton = Button("left", "", () => this.goForward());

    // Button to download the app
    const downloadButton = Button("right", "", () => this.downloadApp());

    // Button to edit and play the app
    const editButton = Button("right", "", () => this.toggleMode());

    // The user avatar box
    const userBlockies = <div className="blockies"
      style={{
        position:"relative",
        //border: "2px solid black",
        width: "24px",
        height: "24px",
        top: "32px",
        left: "0",
        background: "#b7a8a8",
        //width: "24px",
        //height: "24px",
        overflow: "hidden",
        borderRadius:"12px"
      }}>
      <Blockies address={this.getActiveAccount().address} width={24}/>
    </div>;
    const userAvatar = Button("right", userBlockies, e => this.toggleShowAccountList());

    // Account list
    const selectAccount = <SelectAccount
      onClose={() => {
        this.toggleShowAccountList();
      }}
      onImportPrivateKey={key => {
        this.addAccount(Eth.account.fromPrivate(key));
      }}
      onSelectAccount={address => {
        this.setActiveAccount(address);
      }}
      accounts={this.getAccounts()}/>;

    // The top bar itself
    const topBarStyle = {
      paddingTop: "0px",
      whiteSpace: "nowrap",
      overflowX: "hidden",
      height: "70px",
      background: titleBackground,
      borderTop: "1px solid rgb(222,222,222)",
      textAlign: "center"
    };
    const topBar = <div style={topBarStyle}>
      {tabsButton}
      {backButton}
      {forwardButton}
      {titleUrlBar}
      {userAvatar}
      {editButton}
      {downloadButton}
    </div>;

    // Contents, where the app/editor is displayed
    const contents = <div
      style={{
        width:"100%",
        height:"calc(100% - 70px)",
        position:"relative"
      }}
      ref={e=>this.mainport=e}>
      {this.renderApp(this.activeAppData)}
    </div>

    const appBox = <div style={{width:"100%",height:"100%"}}>
      {topBar}
      {contents}
    </div>;

    // The site itself
    return this.state.showModal
      ? <div style={{width:"100%",height:"100%"}}>
        {selectAccount}
        <Blur>{appBox}</Blur>
      </div>
      : <div style={{width:"100%",height:"100%"}}>
        {appBox}
      </div>;
  }
});
