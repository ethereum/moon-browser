const urls = require("./urls.json");
const Moon = require("moon-lang")(urls.infura);
const Eth = require("eth-lib");
const rpc = Eth.rpc(urls.ethereum.mainnet);
const merge = require("./utils").merge;

module.exports = (self, program, baseState, path, yell) => {

  return Moon.performIO(program, {

    // Sets the application's state
    "set": newState => {
      const stateChange = {appState: {[path.join("/")]: newState}};
      self.setState(merge(self.state, stateChange));
      return Promise.resolve(null);
    },

    // Gets the current state
    "get": key => {
      const liveState = self.state.appState[path.join("/")] || {};
      return Promise.resolve(liveState[key] === undefined ? baseState[key] : liveState[key]);
    },

    // Interacts with the Ethereum network
    "eth": (arg) => {
      if (!arg[0].length) {
        return Promise.resolve("Bad arguments.");
      }

      const method = "eth_" + arg[0];
      const params = [].slice.call(arg[1], 0);

      switch (method) {

        case "eth_importPrivateKey":
          var privateKey = prompt("Private key:");
          try {
            var account = Eth.account.fromPrivate(privateKey);
            self.addAccount(account);
            return Promise.resolve("Success.");
          } catch (e) {
            return Promise.resolve("Error.");
          }

        case "eth_sendTransaction":
          var account = self.getActiveAccount();

          // Signs and submits the transaction
          var tx = {
            from: account.address,
            to: params[0].to,
            data: params[0].data || "0x",
            gasPrice: window.GAS_PRICE || "0x04e3b29200",
            gas: window.GAS || "0x106a0", // TODO: remove
            value: params[0].value || "0x0"
          };

          return Eth.transaction.addDefaults(rpc, tx)
            .then(tx => {

              var confirmationMessage
                = "Sign and send transaction?\n\n"
                + "- from: " + tx.from + "\n"
                + "- to: " + tx.to + "\n"
                + "- gasPrice: " + (Eth.nat.toNumber(tx.gasPrice) / 1000000000) + " gwei\n"
                + "- gas: " + Eth.nat.toString(tx.gas) + "\n"
                + "- maxFee: " + Eth.nat.toEther(Eth.nat.mul(tx.gasPrice, tx.gas)) + " eth (gasPrice * gas)\n"
                + "- nonce: " + Eth.nat.toString(tx.nonce) + "\n"
                + "- value: " + Eth.nat.toEther(tx.value) + " eth\n"
                + (tx.data !== "0x"
                  ? "- data:\n\n"
                    + tx.data.slice(2,10) + "\n\n"
                    + tx.data.slice(10)
                      .match(/.{64}/g)
                      .map(x => x.match(/.{32}/g).join("\n")+"\n")
                      .join("\n")
                  : "- data: 0x");

              // Gets user authorization
              if (!confirm(confirmationMessage)) {
                throw "Denied.";
              }

              console.log("-> Sending transaction:", JSON.stringify(tx,null,2));
              return tx;
            })
            .then(tx => Eth.transaction.sign(tx, account))
            .then(stx => {
              console.log("-> Raw transaction (signed):", stx);
              return rpc("eth_sendRawTransaction", [stx]);
            })
            .then(result => {
              console.log("Transaction result:", JSON.stringify(result,null,2));
              if (result.error) {
                alert(result.error);
                return {
                  type: "error",
                  value: result.error
                };
              } else {
                alert("Success. TxHash: " + result);
                return {
                  type: "txHash",
                  value: result
                };
              }
            })
            .catch(err => {
              console.log("Error:", err);
              return {
                type: "error",
                error: typeof err === "string"
                  ? err
                  : JSON.stringify(err)
              }
            });

        default:
          return rpc(method, params);
      }
    },

    // Communicates with a parent component
    "yell": words => {
      return yell(words);
    },

    // Logs something to the console
    "print": string => {
      return Promise.resolve(console.log(string));
    }
  });
};
