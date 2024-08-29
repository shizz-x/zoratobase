exports.Bridge = class Bridge {
  bridgeFromBaseToZoraURL = "https://api-zora.reservoir.tools";
  bridgeFromZoraToBaseURL = "https://api-base.reservoir.tools";
  paths = {
    createBridgeToZora: () => this.bridgeFromBaseToZoraURL + "/execute/call/v1",
    syncBridgeToZora: (txId) =>
      this.bridgeFromBaseToZoraURL + `/transactions/${txId}/synced/v1`,
    createBridgeToBase: () => this.bridgeFromZoraToBaseURL + "/execute/call/v1",
    syncBridgeToBase: (txId) =>
      this.bridgeFromZoraToBaseURL + `/transactions/${txId}/synced/v1`,
  };

  constructor(chainId) {
    this.chainId = chainId;
  }

  async createBridge(walletAddress, value) {
    const response = await fetch(this.paths.createBridgeToBase(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36",
        Priority: "u=1, i",
        Dnt: "1",
        Origin: "https://bridge.zora.energy",
        "X-Rkc-Version": "1.11.2",
      },
      body: JSON.stringify({
        user: walletAddress,
        originChainId: this.chainId,
        txs: [
          {
            to: walletAddress,
            data: "0x",
            value: value,
          },
        ],
      }),
    });
    const data = await response.json();
    return data;
  }
  async syncBridge(txId) {
    const response = await fetch(this.paths.syncBridgeToBase(txId), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36",
        Priority: "u=1, i",
        Dnt: "1",
        Origin: "https://bridge.zora.energy",
        "X-Rkc-Version": "1.11.2",
      },
    });
    const data = await response.json();
    return data;
  }
};
