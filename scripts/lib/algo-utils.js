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
    appArgs
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
        appArgs
    });

    const txnDetails = await signAndSubmitTransaction(algodClient, creatorAccount, txn);
    const appId = txnDetails.response["application-index"];
    const appAddr = algosdk.getApplicationAddress(appId);    
    return { 
        appId,
        appAddr,
        ...txnDetails,
    };
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
    const result = await submitTransaction(algodClient, txn.signTxn(fromAccount.sk));
    return {
        txnId: result.txId,
        confirmedRound: result.response["confirmed-round"],
        response: result.response,
    };
}

//
// Computes a transaction id from a transaction in a block.
//
function computeTransactionId(gh, gen, stib) {
    const t = stib.txn;

    // Manually add gh/gen to construct a correct transaction object
    t.gh = gh;
    t.gen = gen;

    const stxn = {
        txn: algosdk.Transaction.from_obj_for_encoding(t),
    };

    if ("sig" in stib) {
        stxn.sig = stib.sig;
    }

    if ("lsig" in stib) {
        stxn.lsig = stib.lsig;
    }

    if ("msig" in stib) {
        stxn.msig = stib.msig;
    }

    if ("sgnr" in stib) {
        stxn.sgnr = stib.sgnr;
    }

    return stxn.txn.txID();
}

//
// Find a transaction by id in the specified block.
//
async function findTransaction(algodClient, roundNumber, txnId) {
    const block = await algodClient.block(roundNumber).do();

    for (const stxn of block.block.txns) {
        if (computeTransactionId(block.block.gh, block.block.gen, stxn) === txnId) {
            return stxn;
        }
    }

    return undefined;
}

//
// Print a transaction for debugging.
//
async function dumpTransaction(algodClient, roundNumber, txnId) {
    dumpData(await findTransaction(algodClient, roundNumber, txnId));
}

//
// Reads the global state of applications.
//
// https://developer.algorand.org/docs/get-details/dapps/smart-contracts/frontend/apps/#read-state
//
async function readGlobalState(client, addr, appId) {
    const output = {};
    const accountInfoResponse = await client.accountInformation(addr).do();
    for (let i = 0; i < accountInfoResponse["created-apps"].length; i++) {
        if (accountInfoResponse["created-apps"][i].id == appId) {
            for (let n = 0; n < accountInfoResponse["created-apps"][i]["params"]["global-state"].length; n++) {
                const variable = accountInfoResponse["created-apps"][i]["params"]["global-state"][n];
                const name = Buffer.from(variable.key, "base64").toString();
                output[name] = variable.value;
            }
        }
    }
    return output;
}

//
// Creates a new account.
//
async function createAccount() {
    return algosdk.generateAccount();
}

//
// Transfer funds from one account to another.
//
// https://developer.algorand.org/docs/sdks/javascript/#build-first-transaction
//
async function transferFunds(algodClient, fromAccount, toAccountAddr, amount, fee) {
    const params = await algodClient.getTransactionParams().do();
    params.fee = fee;
    params.flatFee = true;

    const txn = algosdk.makePaymentTxnWithSuggestedParams(
        fromAccount.addr,
        toAccountAddr,
        BigInt(amount),
        undefined,
        undefined,
        params
    );
    return await signAndSubmitTransaction(algodClient, fromAccount, txn);
}

//
// Create a new account and fund it with the specified amount.
//
async function createFundedAccount(algodClient, faucetAccount, amount, fee) {
    const newAccount = await createAccount();
    await transferFunds(algodClient, faucetAccount, newAccount.addr, amount, fee);
    return newAccount;
}

module.exports = {
    deployApp,
    deleteApp,
    dumpObject,
    readFile,
    compileProgram,
    submitTransaction,
    signAndSubmitTransaction,
    findTransaction,
    dumpTransaction,
    readGlobalState,
    createAccount,
    transferFunds,
    createFundedAccount,
};