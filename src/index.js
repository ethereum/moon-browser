const Eth = require("eth-lib");
const Moon = require("moon-lang")("https://ipfs.infura.io:5001");
const eth = Eth.Api(Eth.Provider("https://mainnet.infura.io/sE0I5J1gO2jugs9LndHR"));
const Inferno = require("inferno");
const Editor = require("./editor");
const createClass = require("inferno-create-class");
const renderTerm = require("./render-term");
const emojis = require("./emojis.json");
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
    this.emojiOf = "zb2rhdjiBvMfHkm4ewHPkodmJJ5i87c85Q2w9SXs9nykkHrYm";

    Moon.imports(this.emojiOf)
      .then(Moon.parse)
      .then(emojiOf => {
        this.getStringEmoji = emojiOf;
        this.forceUpdate();
      });

    const localData = JSON.parse(window.localStorage.getItem(this.localDataKey));

    return localData || (() => {
      const firstAccount = Eth.Account.create();
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



  // Ethereum methods
  
  // Fetches:
  // - account balances
  fetchEthereumData() {
    const addresses = Object.keys(this.state.accounts);
    const balancesP = addresses.map(addr => eth.getBalance(addr, "latest"));
    const accountsP = Promise.all(zipWith(addresses, balancesP, (address, balanceP) => {
      return balanceP.then(balance => merge(this.getAccount(address), {balance}));
    }));
    accountsP.then(accountsArray => {
      let accounts = {};
      accountsArray.forEach(account => accounts[account.address] = account);
      this.setState({accounts});
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

  getAccountEmoji(account) {
    return this.getStringEmoji ? this.getStringEmoji(account.address) : "-";
  },

  getAccountBalance(account) {
    return account.balance ? Eth.Nat.toEther(account.balance) : 0; 
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
    return Moon.performIO(program, {
      "setState": newState => {
        this.setState(merge(this.state, {appState: {[path.join("/")]: newState}}));
        return Promise.resolve(null);
      },
      "eth": ({0:method, 1:args}) => {
        switch (method) {
          case "accounts":
            return Promise.resolve(Object.keys(this.state.accounts));
          case "sendTransaction":
            var {from, to, value} = args;
            var account = this.getAccount(from);
            // Checks if account exists
            if (!account) {
              return Promise.resolve("Account not found.");
            // Gets user authorization
            } else if (!confirm("Send " + value + " eth?")) {
              return Promise.resolve("Denied.");
            // Signs and submits the transaction
            } else {
              var tx = {
                from: from,
                to: to,
                value: Eth.Nat.fromEther(value) // currently in Ether (number), TODO: receive hex bignum
              };
              return eth.addTransactionDefaults(tx)
                .then(tx => Eth.Account.signTransaction(tx, account.privateKey))
                .then(stx => eth.sendRawTransaction(stx));
            }
          case "importPrivateKey":
            var privateKey = prompt("Private key:");
            try {
              var account = Eth.Account.fromPrivate(privateKey);
              this.addAccount(account);
              return Promise.resolve("Success.");
            } catch (e) {
              return Promise.resolve("Error.");
            }
          case "selectAccount":
            this.setState({activeAccount: args[0]});
            return Promise.resolve("Success.");
        }
      },
      "yell": words => {
        return yell(words);
      },
      "print": string => {
        return Promise.resolve(console.log(string));
      }
    });
  },



  // Render
   
  render() {
    if (!this.state) {
      return <div>Loading...</div>;
    }

    // Useful data
    const activeAccount = this.getActiveAccount();
    const canGoBack = this.state.activeAppHistory.length <= 1;

    // Component for a top-bar button
    const Button = (icon, style, onClick) =>
      <span
        className="unselectable"
        style={{
          display: "inline-block",
          cursor: "pointer",
          verticalAlign: "top",
          width: "24px",
          height: "24px",
          lineHeight: "24px",
          textAlign: "center",
          fontSize: "22px",
          color: !style.disabled ? "rgb(109,109,109)" : "rgb(216,216,216)",
          ...style
        }}
        onClick={onClick || (()=>{})}>
      {icon}
      </span>;

    // The URL input displayed on top
    const urlInput = <input
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
      style={{
        display: "inline-block",
        verticalAlign: "top",
        border: "1px solid rgb(223,223,223)",
        borderRadius: "2px",
        background: "white",
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
    const optionsButtonStyle = {
      fontSize: "18px",
      fontWeight: "bold",
      paddingTop: "0px"
    };
    const optionsButton = Button("⋮",
      optionsButtonStyle,
      e => { this.toggleDebug(); e.stopPropagation() });

    // The user avatar box 
    const userAvatarStyle = {
      lineHeight: "24px",
      float: "right",
      cursor: "pointer",
      fontSize: "20px",
      position: "relative",
      top:"2px"
    };
    const userAvatar = <span
      onClick={e => { this.setActiveApp(this.accountsApp); e.stopPropagation(); }}
      className="unselectable"
      style={userAvatarStyle}>
      {this.getAccountEmoji(this.getActiveAccount())}
    </span>;
    
    // Moon-browser button
    const moonButtonStyle = {
      fontSize: "22px",
      paddingTop: "0px"
    };
    const moonButton = Button("☾",
      moonButtonStyle,
      e => { this.setActiveApp(this.moonApp); e.stopPropagation(); });

    // Button to go back <-
    const backButtonStyle = {
      disabled: canGoBack,
      fontSize: "14px",
      paddingTop: "2px"
    };
    const backButton = Button("⬅",
      backButtonStyle,
      e => { this.goBack(); e.stopPropagation(); });

    // Button to edit and play the app
    const editButtonIcon = this.state.mode === "edit" ? "⌁" : "✎";
    const editButton = Button(
      editButtonIcon,
      {paddingTop: "1px"},
      e => { this.toggleMode(); e.stopPropagation(); });

    // The top bar itself
    const topBarStyle = {
      padding: "4px",
      whiteSpace: "nowrap",
      overflowX: "hidden",
      height: "33px",
      background: `
        linear-gradient(to bottom,
          rgba(255,255,255,1) 0%,
          rgba(246,246,246,1) 30%,
          rgba(241,241,241,1) 100%)`,
      borderBottom: "1px solid rgb(220,220,220)"
    };
    const topBar = <div style={topBarStyle}>
      {backButton}
      {editButton}
      {urlInput}
      {optionsButton}
      {userAvatar}
    </div>;

    // Contents, where the app/editor is displayed
    const contents = <div 
      style={{width:"100%", height:"calc(100% - 33px)", position:"relative"}}
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
