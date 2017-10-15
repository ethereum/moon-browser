const Inferno = require("inferno");
const createClass = require("inferno-create-class");
const Modal = require("./modal.js");
const Blockies = require("./blockies.js");

// Todo: convince AVSA the importance of locality
module.exports = createClass({
  render() {
    return <Modal onClose={() => this.props.onClose()}>
      <div className="title" style={{
          textTransform:"uppercase",
          fontSize:"15px",
          fontWeight:"600",
          color:"#4A4A4A",
          height:"36.8px",
          top:"4px",
          position:"relative"}}>
        Select your profile
      </div>
      <div>{
        this.props.accounts.map(account => {
          return <div>
            <div style={{
              position:"absolute",
              left:"17px",
              top:"48px",
              width:"32px",
              height:"32px",
              borderRadius:"16px"
            }}>
              <Blockies address={account.address} width={32}/>
            </div>
            <div style={{
              position:"absolute",
              left:"59px",
              top:"54px",
              color:"#4A90E2",
              fontWeight:"300",
              overflow:"hidden",
              textOverflow:"ellipsis",
              width:"350px",
              fontSize:"16px",
              letterSpacing:"0.7px"}}>
              {account.address}
            </div>
          </div>
        })
      }</div>
      <div style={{
          position:"absolute",
          top:"100px",
          textAlign:"center",
          textTransform:"uppercase",
          fontWeight:"600",
          color:"#4A90E2",
          width:"380px",
          borderTop:"solid 1px rgba(204,188,189,.4)",
          paddingTop:"18.4px"}}>
        Create/import account
      </div>
    </Modal>;
  }
});
