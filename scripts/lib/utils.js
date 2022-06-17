//
// Utility functions for deploying and interacting with the teal-counter.
// You can think of this as the "SDK" for the teal-counter.
//

const algosdk = require("algosdk");
const { deployApp, readFile, signAndSubmitTransaction } = require("./algo-utils");

const config = require("../config");

//
// Deploys the Teal-counter to the sandbox.
//
async function deployTealCounter(algodClient, creatorAccount, initialValue) {

    // Deploy the smart contract.
    return await deployApp(
        algodClient,
        creatorAccount,
        await readFile(config.APPROVAL_PROGRAM),
        await readFile(config.CLEAR_PROGRAM),
        config.STANDARD_FEE,
        config.GLOBAL_BYTE_SLICES,
        config.GLOBAL_INTS,
        config.LOCAL_BYTE_SLICES,
        config.LOCAL_INTS,
        [
            algosdk.encodeUint64(initialValue),
        ]
    );
}

//
// Invokes a "method" in the teal counter.
//
async function invokeTealCounter(algodClient, creatorAccount, appId, method) {

    const params = await algodClient.getTransactionParams().do();
    params.fee = 1000;
    params.flatFee = true;

    const callTxn = algosdk.makeApplicationNoOpTxn(
        creatorAccount.addr,
        params,
        appId,
        [
            new Uint8Array(Buffer.from(method)),
        ],
    );

    return await signAndSubmitTransaction(algodClient, creatorAccount, callTxn);
}

//
// Invokes the "increment" method of the smart contract.
//
async function invokeIncrement(algodClient, creatorAccount, appId) {
    return await invokeTealCounter(algodClient, creatorAccount, appId, "increment");
} 

//
// Invokes the "decrement" method of the smart contract.
//
async function invokeDecrement(algodClient, creatorAccount, appId) {
    return await invokeTealCounter(algodClient, creatorAccount, appId, "decrement");
} 

module.exports = {
    deployTealCounter,
    invokeTealCounter,
    invokeIncrement,
    invokeDecrement,
};