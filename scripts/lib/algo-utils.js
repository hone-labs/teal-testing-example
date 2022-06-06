const algosdk = require("algosdk");
const fs = require("fs/promises");

//
// Deploys a TEAL smart contract application.
//
 async function deployApp(
    algodClient,
    creatorAccount,
    approvalProgramCode,
    clearProgramCode,
    fee,
    numGlobalByteSlices,
    numGlobalInts,
    numLocalByteSlices,
    numLocalInts,
    appArgs,
    foreignAssets,
    foreignApps,
    accounts,
    extraPages
) {
    const params = await algodClient.getTransactionParams().do();
    params.fee = fee;
    params.flatFee = true;

    const txn = algosdk.makeApplicationCreateTxnFromObject({
        from: creatorAccount.addr,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        suggestedParams: params,
        approvalProgram: await compileProgram(algodClient, approvalProgramCode),
        clearProgram: await compileProgram(algodClient, clearProgramCode),
        numGlobalByteSlices,
        numGlobalInts,
        numLocalByteSlices,
        numLocalInts,
        foreignAssets,
        accounts,
        foreignApps,
        appArgs,
        extraPages
    });

    const txnDetails = await signAndSubmitTransaction(algodClient, creatorAccount, txn);
    const appId = txnDetails.response["application-index"];
    return appId;
}

//
// Deletes a TEAL smart contract application.
//
async function deleteApp(
    algodClient,
    creatorAccount,
    appId,
    fee
) {
    const params = await algodClient.getTransactionParams().do();
    params.fee = fee;
    params.flatFee = true;

    const txn = algosdk.makeApplicationDeleteTxn(creatorAccount.addr, params, appId);

    const txnDetails = await signAndSubmitTransaction(algodClient, creatorAccount, txn);
    const deletedAppId = txnDetails.response["txn"]["txn"].apid;
    return deletedAppId;
}

//
// A helper function to debug log an object.
//
function dumpObject(label, obj) {
    console.log(`---- ${label}:`);
    console.log(JSON.stringify(obj, jsonEncoder, 4));
}

//
// A custom JSON encoder for outputing a buffer.
//
function jsonEncoder(key, value) {
    if (value && value.type === "Buffer") {
        return "<Buffer>";
    }

    if (value instanceof Uint8Array) {
        return "<Uint8Array>";
    }

    if (Buffer.isBuffer(value)) {
        return "<Buffer>";
    }

    return value;
}

//
// Reads a file from the file system.
//
async function readFile(fileName) {
    return await fs.readFile(fileName, "utf-8");
}


//
// Loads and compiles a TEAL program.
//
async function compileProgram(client, sourceCode) {
    const compileResponse = await client.compile(sourceCode).do();
    return new Uint8Array(Buffer.from(compileResponse.result, "base64"));
}

//
// Submits a signed transaction, then waits for confirmation.
//
async function submitTransaction(algodClient, signedTxn) {
    const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
    const response = await algosdk.waitForConfirmation(algodClient, txId, 4);
    return { txId, response };
}

//
// Signs and submits a transaction, then waits for confirmation.
//
async function signAndSubmitTransaction(algodClient, fromAccount, txn) {
    return await submitTransaction(algodClient, txn.signTxn(fromAccount.sk));
}

module.exports = {
    deployApp,
    deleteApp,
    dumpObject,
    readFile,
};