const algosdk = require("algosdk");

const { expectFields, dumpData } = require("../../lib/utils");

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
// Expect that a transaction exists with the specified fields.
//
async function expectTransaction(algodClient, roundNumber, txnId, expectedValues) {
    expectFields(await findTransaction(algodClient, roundNumber, txnId), expectedValues);
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
// Expect that global state for an application has the specified fields.
//
async function expectGlobalState(algodClient, accountAddr, appId, expectedValues) {
    const globalState = await readGlobalState(algodClient, accountAddr, appId);
    expectFields(globalState, expectedValues);
}

//
// Display global state for the app.
//
async function dumpGlobalState(algodClient, accountAddr, appId) {
    dumpData(await readGlobalState(algodClient, accountAddr, appId));
}

module.exports = {
    findTransaction,
    expectTransaction,
    dumpTransaction,
    readGlobalState,
    expectGlobalState,
    dumpGlobalState,
};