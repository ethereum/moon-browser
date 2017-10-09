const urls = require("./urls.json");
const Eth = require("eth-lib");
const Moon = require("moon-lang")(urls.ipfs);
const performIO = require("./perform-io");
const rpc = Eth.rpc(urls.ethereum.mainnet);
const Inferno = require("inferno");
const Editor = require("./editor");
const createClass = require("inferno-create-class");
const renderTerm = require("./render-term");
const {merge, memoizeAsync, zipWith} = require("./utils");

// Temporary hack for debugging
window.reset = () => window.localStorage.removeItem("mist-lite-data");

const Home = createClass({

  // Lifecycle
  
  getInitialState() {
    this.activeAppInfo = {};
    this.activeAppInfoNonce = 0;
    this.localDataKey = "mist-lite-data";
    this.moonApp = "zb2rhi7fsdeKtAvGi1seH73xykAp6A9DJ2FJdV96vnWg5iqib";
    this.accountsApp = "zb2rhZfPHBBEj4MQBAT36aPPuqya93dWEkwrXYdDMYz6Fo3xB";

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
        activeAppHistory: [this.moonApp],
        appState: {},
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
  },

  componentWillUnmount() {
    clearTimeout(this.firstRefreshTimeout);
    clearInterval(this.fetchEthereumDataTimer);
    clearInterval(this.stateSaverInterval);
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

  getPublicAccounts() {
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

  getAccountBalance(account) {
    return account.balance ? Eth.nat.toEther(account.balance) : 0; 
  },

  getAccountBalanceString(account) {
    const balance = this.getAccountBalance(account);
    return balance ? balance.toFixed(2) : "2";
  },



  // App methods
  getActiveApp(state) {
    return (state || this.state).activeAppHistory[(state || this.state).activeAppHistory.length - 1];
  },

  setActiveApp(name) {
    Moon.load(name).then(code => {
      if (this.activeAppInfo.code !== code) {
        this.state.activeAppHistory.push(name);
      }
      const newState = merge(this.state, {activeAppHistory: this.state.activeAppHistory});
      const activeApp = this.getActiveApp(newState);
      const invalid = () => ({type:"txt", value:"<invalid-term>"});
      const term = Moon.imports(activeApp).then(Moon.parse).catch(invalid);
      const nonce = this.activeAppInfoNonce++;
      return term.then(term => {
        if (nonce + 1 === this.activeAppInfoNonce) { // avoids front running
          this.activeAppInfo = {code, term};
          this.setState(newState);
          this.forceUpdate();
        }
      });
    }).catch(()=>{});
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

  goBack() {
    if (this.state.activeAppHistory.length > 1) {
      this.state.activeAppHistory.pop();
      this.refreshApp();
    }
  },

  toggleMode() {
    this.setState({mode:({play:"edit",edit:"play"})[this.state.mode]});
  },

  toggleDebug() {
    this.setState({debug:!this.state.debug});
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
      return <div style={{position:"relative"}}>
        {renderTerm(
          term,
          [],
          [width, height],
          this.state.appState,
          this.getPublicAccounts(),
          this.performIO,
          this.state.debug)}
      </div>;

    }
  },

  performIO(program, path, yell) {
    return performIO(this, program, path, yell);
  },



  // Render
   
  render() {
    if (!this.state) {
      return <div>Loading...</div>;
    }

    // Useful data
    const activeAccount = this.getActiveAccount();
    const canGoBack = this.state.activeAppHistory.length <= 1;

    // The DApp title
    const title = <span style={{
      fontSize: "12px",
      fontWeight: "bold",
      fontFamily: "helvetica",
      color: "rgb(108,108,108)"}}>
      Welcome to Moon!
    </span>;

    // The URL input displayed on top
    const url = <input
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
      style={{
        display: "inline-block",
        verticalAlign: "top",
        border: "0px solid white",
        background: "rgba(0,0,0,0)",
        color: "rgb(167,167,167)",
        margin: "0px 4px",
        padding: "4px",
        width: "366px",
        height: "24px",
        fontSize: "12px",
        fontFamily: "monospace"
      }}
      onInput={e => this.setActiveApp(e.target.value)}
      value={this.getActiveApp()}/>;
      
    // The (...) options for the app
    //const optionsButtonStyle = {
      //fontSize: "18px",
      //fontWeight: "bold",
      //paddingTop: "0px"
    //};
    //const optionsButtonEffect = e => { this.toggleDebug(); e.stopPropagation() };
    //const optionsButton = Button("⋮", optionsButtonStyle, optionsButtonEffect);

    // Title
    const titleUrl = <div
      style={{
        display: "inline-block",
        verticalAlign: "top",
        height: "100%",
        paddingTop: "20px"
      }}>
      <div>{title}</div>
      <div>{url}</div>
    </div>;

    // Component for a top-bar button
    const Button = (align, icon, onClick) =>
      <span
        className="unselectable"
        style={{
          display: "inline-block",
          cursor: "pointer",
          verticalAlign: "top",
          width: "32px",
          height: "70px",
          lineHeight: "70px",
          fontSize: "14px",
          float: align
        }}
        onClick={onClick || (()=>{})}>
      <img
        src={"images/"+icon+"@2x.png"}
        width="30px"
        style={{
          display: "inline-block",
          verticalAlign: "bottom",
          paddingBottom: "6px"
        }}/>
      </span>;

    // Tabs button
    const tabsButton = Button("left", "tabs-open", e => (this.gotabs(), e.stopPropagation()));

    // Button to go back
    const backButton = Button("left", "back", e => (this.goBack(), e.stopPropagation()));

    // Button to edit and play the app
    const editButton = Button("right", "edit", e => (this.toggleMode(), e.stopPropagation()));

    // The user avatar box 
    const userAvatar = Button("right", "edit", e => (this.setActiveApp(this.accountsApp), e.stopPropagation()));

    // The top bar itself
    const topBarStyle = {
      paddingTop: "0px",
      whiteSpace: "nowrap",
      overflowX: "hidden",
      height: "70px",
      background: "rgb(241,241,241)",
      borderTop: "1px solid rgb(222,222,222)",
      textAlign: "center"
    };
    const topBar = <div style={topBarStyle}>
      {tabsButton}
      {backButton}
      {titleUrl}
      {editButton}
    </div>;
      //{userAvatar}

    // Contents, where the app/editor is displayed
    const contents = <div 
      style={{
        width:"100%",
        height:"calc(100% - 70px)",
        position:"relative"
      }}
      ref={e=>this.mainport=e}>
      {this.renderApp(this.activeAppInfo)}
    </div>

    // The site itself
    return <div style={{width:"100%",height:"100%"}}>
      {topBar}
      {contents}
    </div>;
  }
});



window.onload = () => 
  Inferno.render(
    <Home/>,
    document.getElementById("main"));
