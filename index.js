const fs = require("fs");
const readline = require("readline");
const Web3 = require("web3");
const { Wallet } = require("./Wallet.js");
const { Bridge } = require("./Bridge.js");

async function processLineByLine() {
  let array = [];

  const fileStream = fs.createReadStream("p.txt");

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    // Each line in the file will be successively available here as `line`.
    array.push(line);
  }

  return array;
}

(async () => {
  const web3 = new Web3.Web3("https://rpc.zora.energy");
  const chainId = await web3.eth.net.getId();
  const bridge = new Bridge(Number(chainId));
  const fiveDollarsComission = BigInt(
    web3.utils.toWei("0.000400000000000000", "ether") //0.001600000000000000
  );
  const gasPrice = web3.utils.toWei("0.1", "gwei");

  const privateKeys = await processLineByLine();
  errored = [];
  const wallets = privateKeys.map((privateKey, index) => {
    try {
      console.clear();

      const wallet = new Wallet(privateKey, web3);

      console.log(`${index + 1} / ${privateKeys.length}`);

      return wallet;
    } catch (e) {
      errored.push(privateKey);
    }
  });
  errored.forEach((privateKey) => {
    console.log(privateKey + " failed");
  });
  if (errored.length > 0) {
    console.log("Private keys failed, remove please.");
    return await new Promise((resolve) => setTimeout(resolve, 10000));
  }

  let totalStartTime = Date.now();
  let totalEndTime = 0;
  let avgTimePerIteration = 0;
  let estimatedTimeRemaining = 0;
  const erroredBridges = [];
  for (let index = 0; index < wallets.length; index++) {
    let iterationStartTime = Date.now();

    console.clear();
    erroredBridges.map((erroredBridge) => {
      console.log(erroredBridge);
    });
    console.log(
      `${index + 1} / ${
        wallets.length
      }, estimated time remaining: ${estimatedTimeRemaining.toFixed(2)} min`
    );

    console.log(`init wallet ${wallets[index].keyPair.address}`);

    await wallets[index].init();

    console.log(
      `Confirmed balance ${web3.utils.fromWei(
        wallets[index].balance,
        "ether"
      )} eth`
    );

    const response = await startBridge(
      wallets[index],
      bridge,
      fiveDollarsComission,
      gasPrice
    );

    if (response instanceof Error) {
      erroredBridges.push(response.message);
    }

    totalEndTime = Date.now();
    avgTimePerIteration =
      (totalEndTime - totalStartTime) / 1000 / 60 / (index + 1); // in minutes

    estimatedTimeRemaining = avgTimePerIteration * (wallets.length - index - 1); // in minutes

    if (erroredBridges.length <= 2) {
      if (index == wallets.length - 1) {
        erroredBridges.map((erroredBridge) => {
          console.log(erroredBridge);
        });
      }
    }
  }
  console.log("Done");
  await new Promise((resolve) => setTimeout(resolve, 60000));
})();
async function startBridge(wallet, bridgeFactory, commission, gasPrice) {
  const estimatedServiceFee = BigInt("330000000000");

  if (wallet.balance < commission + estimatedServiceFee) {
    return Error(wallet.privateKey + " Not enough balance to pay commission");
  }
  console.log("Creating bridge...");
  function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
  }
  const randomNum = getRandomInt(60, 90);
  const amountToTransfer = (
    ((wallet.balance - (commission + estimatedServiceFee)) *
      BigInt(randomNum)) /
    100n
  )
    .toString()
    .split(".")[0];
  console.log("Random multiplier: " + randomNum + "%");
  console.log("Amount to transfer: " + amountToTransfer);
  const createdBridge = await bridgeFactory.createBridge(
    wallet.keyPair.address,
    amountToTransfer
  );
  const bridgeDepositStep = createdBridge.steps.filter(
    (step) => step.id == "deposit"
  )[0];
  const bridgeAntibotStep = createdBridge.steps.filter(
    (step) => step.id == "request-signature"
  )[0];
  if (bridgeAntibotStep.items.length > 0) {
    console.error(
      "Antibot system detected us, exiting application after 10 seconds"
    );
    await new Promise((resolve) => setTimeout(resolve, 10000));
    throw new Error("Antibot system detected us, exiting application");
  }
  console.log("Bridge created. Waiting for deposit...");

  const bridgeDepositTxData = bridgeDepositStep.items[0].data;
  const txHash = await wallet.sendTransaction({
    from: bridgeDepositTxData.from,
    to: bridgeDepositTxData.to,
    value: bridgeDepositTxData.value,
    accessList: [],
    data: bridgeDepositTxData.data,
    gas: 200000,
    gasPrice: gasPrice,
  });
  console.log("Deposited with tx " + txHash.slice(0, 10) + "...");

  const synced = await syncBridge(txHash, bridgeFactory);

  return synced;
}
const syncBridge = async (txHash, bridgeFactory, iteration = 1) => {
  const syncResponse = await bridgeFactory.syncBridge(txHash);

  if (iteration >= 4) {
    console.log(
      "Failed to sync trx " + txHash.slice(0, 10) + "... Dont worry, its okay",
      syncResponse
    );
    return false;
  }

  console.log("Syncing trx on chains " + txHash.slice(0, 10) + "...");
  if (syncResponse.synced == true) {
    return true;
  } else {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return await syncBridge(txHash, bridgeFactory, iteration + 1);
  }
};
