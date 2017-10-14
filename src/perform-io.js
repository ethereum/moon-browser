const urls = require("./urls.json");
const Moon = require("moon-lang")(urls.infura);
const Eth = require("eth-lib");
const rpc = Eth.rpc(urls.ethereum.mainnet);
const merge = require("./utils").merge;

module.exports = (self, program, path, yell) => {

  return Moon.performIO(program, {

    // Sets the application's state
    "setState": newState => {
      self.setState(merge(self.state, {appState: {[path.join("/")]: newState}}));
      return Promise.resolve(null);
    },

    // Gets the current state
    "getState": () => {
      return Promise.resolve(self.state.appState[path.join("/")]);
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

          // Gets user authorization
          if (!confirm("Send " + Eth.nat.toEther(params[0].value || "0x0") + " eth?")) {
            return Promise.resolve("Denied.");
          }

          // Signs and submits the transaction
          var tx = {
            from: account.address,
            to: params[0].to,
            data: params[0].data || "0x",
            gasPrice: "0x04e3b29200",
            gas: "0x106a0", // TODO: remove
            value: params[0].value || "0x0"
          };

          return Eth.transaction.addDefaults(rpc, tx)
            .then(tx => {
              console.log("-> Sending transaction:", JSON.stringify(tx,null,2));
              return tx;
            })
            .then(tx => Eth.transaction.sign(tx, account))
            .then(stx => {
              console.log("-> Raw transaction (signed):", stx);
              rpc("eth_sendRawTransaction", [stx]);
            })
            .then(result => {
              console.log("Transaction result:", JSON.stringify(result,null,2));
              return result.error
                ? {type: "error", value: result.error}
                : {type: "txHash", value: result}
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
