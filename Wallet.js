exports.Wallet = class Wallet {
  balance;
  web3;
  privateKey;
  constructor(privateKey, web3) {
    this.web3 = web3;
    this.keyPair = web3.accountProvider.privateKeyToAccount(privateKey);
    this.privateKey = privateKey;
  }

  async init() {
    this.balance = await this._getBalance();
  }

  async _getBalance() {
    const balance = await this.web3.eth.getBalance(this.keyPair.address);
    this.balance = balance;
    return balance;
  }

  async sendTransaction(tx) {
    const signedTx = await this.keyPair.signTransaction(tx);
    return await this.web3.eth
      .sendSignedTransaction(signedTx.rawTransaction)
      .then((receipt) => {
        return signedTx.transactionHash;
      })
      .catch((error) => {
        console.error("An error occurred:", error);
        return error;
      });
  }
};
