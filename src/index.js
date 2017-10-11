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
const Blockies = require("./blockies");

// Temporary hack for debugging
window.reset = () => window.localStorage.removeItem("mist-lite-data");

// Todo: 1. finish, 2. move it to other file
const AccountList = createClass({
  render() {
    return <div
      style={{
        position: "fixed",
        top: "70px",
        right: "0px",
        zIndex: 2,
        width: "420px",
        paddingLeft: "18px",
        background: "rgb(241,241,241)",
        border: "1px solid rgb(227,227,227)",
        boxShadow: "0px 0px 1px rgb(99,99,99)"
      }}>
      <div>
        Select your profile
      </div>
      <div>{
        this.props.accounts.map(account => {
          return <div style={{
            height: "32px",
            margin: "7px 0px"
            }}>
            <div style={{
              display:"inline-block",
              overflow: "hidden",
              verticalAlign: "middle",
              borderRadius: "16px"
              }}>
              <Blockies address={account.address} width={32}/>
            </div>
            <div style={{
              fontFamily: "monospace",
              fontSize: "14px",
              display: "inline-block",
              marginLeft: "4px",
              verticalAlign: "middle"
              }}>
              {account.address}
            </div>
          </div>
        })
      }</div>
      <div
        style={{
          cursor: "pointer",
          fontFamily: "helvetica",
          fontSize: "18px",
          color: "rgb(92,149,219)"
        }}>
        Create/import account
      </div>
    </div>;
  }
});

// Todo: break into smaller components
const Home = createClass({

  // Lifecycle
  
  getInitialState() {
    this.activeAppInfo = {};
    this.activeAppInfoNonce = 0;
    this.localDataKey = "mist-lite-data";
    this.homeAppCid = "zb2rhi7fsdeKtAvGi1seH73xykAp6A9DJ2FJdV96vnWg5iqib";

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
        showAccountList: false,
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
    if (name !== this.getActiveApp()) {
      console.log("-> Setting active app to: " + name);
      Moon.load(name).then(code => {
        console.log("-> Loaded code. Importing dependencies.");
        if (this.activeAppInfo.code !== code) {
          this.state.activeAppHistory.push(name);
        }
        const newState = merge(this.state, {activeAppHistory: this.state.activeAppHistory});
        const activeApp = this.getActiveApp(newState);
        const invalid = () => ({type:"txt", value:"<invalid-term>"});
        const term = Moon.imports(activeApp)
          .then(imported => {
            console.log("-> Imported " + imported.length + " chars. Parsing...");
            return Moon.parse(imported, {fast:1});
          })
          .catch(invalid);
        const nonce = this.activeAppInfoNonce++;
        return term.then(term => {
          console.log("-> Code parsed. Initializing DApp...");
          if (nonce + 1 === this.activeAppInfoNonce) { // avoids front running
            this.activeAppInfo = {code, term};
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

  goBack() {
    if (this.state.activeAppHistory.length > 1) {
      this.state.activeAppHistory.pop();
      this.refreshApp();
    }
  },

  toggleMode() {
    this.setState({mode:({play:"edit",edit:"play"})[this.state.mode]});
  },

  toggleShowAccountList() {
    this.setState({showAccountList: !this.state.showAccountList});
  },

  toggleDebug() {
    this.setState({debug: !this.state.debug});
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
        onClick={(e) => { onClick(e); e.stopPropagation() }}>
      {typeof icon === "string"
        ?  <img
          src={"images/"+icon+"@2x.png"}
          width="30px"
          style={{
            display: "inline-block",
            verticalAlign: "bottom",
            paddingBottom: "6px"
          }}/>
        : icon}
      </span>;

    // Tabs button
    const tabsButton = Button("left", "tabs-open", () => this.gotabs());

    // Button to go back
    const backButton = Button("left", "back", () => this.goBack());

    // Button to edit and play the app
    const editButton = Button("right", "edit", () => this.toggleMode());

    // The user avatar box 
    const userBlockies = <div
      style={{
        position:"relative",
        //border: "2px solid black",
        width: "24px",
        height: "24px",
        marginTop: "36px",
        marginLeft: "6px",
        //width: "24px",
        //height: "24px",
        overflow: "hidden",
        borderRadius:"12px"
        }}>
      <Blockies address={this.getActiveAccount().address} width={24}/>
    </div>;
    const userAvatar = Button("right", userBlockies, e => this.toggleShowAccountList());

    // Account list
    const accountList = <AccountList accounts={this.getPublicAccounts()}/>;

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
      {userAvatar}
      {editButton}
    </div>;

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
      {this.state.showAccountList ? accountList : null}
      {contents}
    </div>;
  }
});



window.onload = () => 
  Inferno.render(
    <Home/>,
    document.getElementById("main"));
