const Inferno = require("inferno");
const createClass = require("inferno-create-class");
const Modal = require("./modal.js");
const Blockies = require("./blockies.js");

const Title = (props) =>{
  return <div style={{
      textTransform:"uppercase",
      fontSize:"15px",
      fontWeight:"600",
      color:"#4A4A4A",
      height:"36.8px",
      top:"4px"
    }}>
    {props.children}
  </div>
};

const Button = (props) => {
  return <div
    className="unselectable"
    onClick={() => props.onClick()}
    style={{
      textAlign:"center",
      textTransform:"uppercase",
      fontWeight:"600",
      color:"#4A90E2",
      cursor:"pointer",
      width:"100%",
      marginTop: "12px",
      marginBottom: "6px",
      borderTop:"solid 1px rgba(204,188,189,.4)",
      paddingTop:"18px"
    }}>
    {props.children}
  </div>;
};

const Account = (props) => {
  return <div
    style={{
      cursor: "pointer",
      whiteSpace: "nowrap",
      padding: "4px"
    }}
    onClick={props.onClick}>
    <div style={{
        display:"inline-block",
        verticalAlign:"middle",
        width:"32px",
        height:"32px",
        cursor:"pointer",
        borderRadius:"16px",
        position:"relative",
        overflow: "hidden"
      }}>
      <Blockies
        address={props.account.address}
        width={32}
      />
    </div>
    <div style={{
        display:"inline-block",
        verticalAlign:"middle",
        color:"#4A90E2",
        fontWeight:"300",
        overflow:"hidden",
        textOverflow:"ellipsis",
        fontSize:"16px",
        padding: "8px",
        letterSpacing:"0.7px"
      }}>
      {props.account.address}
    </div>
  </div>
};

const Input = (props) => {
  return <input
    style={{
      width: "100%",
      height: "24px",
      background: "rgb(250,250,250)",
      borderBottom:
        props.status === "valid"
          ? "2px solid green"
          : props.status === "invalid"
            ? "2px solid red"
            : "0px solid black"
    }}
    onInput={props.onInput}/>;
};

// Todo: convince AVSA the importance of locality
module.exports = createClass({
  getInitialState() {
    return {
      page: "list", // "list" | "importAccount"
      importKey: ""
    }
  },
  selectPage(page) {
    this.setState({
      page: page,
      importKey: ""
    });
  },
  // Instead of using a conditional, I'm rendering all the
  // pages and hiding the ones that aren't selected. The
  // reason is Inferno seems not to be setting the `onClick`
  // of the "import" button correctly, for some reason.
  showIf(page) {
    return this.state.page === page ? "block" : "none";
  },
  renderList() {
    return <div style={{display: this.showIf("list")}}>
      <Title>
        Select your account
      </Title>
      <div>
        {this.props.accounts.map(account =>
          <Account
            onClick={() => this.props.onSelectAccount(account.address)}
            account={account}/>
        )}
      </div>
      <Button onClick={() => this.selectPage("importAccount")}>
        Create/import account
      </Button>
    </div>;
  },
  importKeyStatus() {
    return /^(0x|)[0-9a-f]{64}$/.test(this.state.importKey)
      ? "valid"
      : this.state.importKey.length === 0
        ? "empty"
        : "invalid";
  },
  renderImportAccount() {
    return <div style={{display: this.showIf("importAccount")}}>
      <Title>
        Enter Private Key
      </Title>
      <Input
        status={this.importKeyStatus()}
        onInput={e => {
          this.setState({importKey: e.target.value});
        }}/>
      <Button
        onClick={() => {
          switch (this.importKeyStatus()) {
            case "valid":
              const key = this.state.importKey;
              const hex = (/^0x/.test(key) ? "" : "0x") + key;
              this.props.onImportPrivateKey(hex);
              this.selectPage("list");
              break;
            case "invalid":
              alert("Must be 64 hex (0-9, a-f) chars.");
              break;
            case "empty":
              alert("Enter the private key.");
              break;
          };
        }}>
        Import
      </Button>
    </div>;
  },

  renderPage() {
    switch (this.state.page) {
      case "list":
        return this.renderList();
      case "importAccount":
        return this.renderImportAccount();
    }
  },
  render() {
    return <Modal onClose={() => this.props.onClose()}>
      {this.renderList()}
      {this.renderImportAccount()}
    </Modal>;
  }
});
