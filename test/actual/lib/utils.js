const { expectFields, dumpData } = require("../../lib/utils");
const { findTransaction, readGlobalState } = require("../../../scripts/lib/algo-utils");

//
// Expect that a transaction exists with the specified fields.
//
async function expectTransaction(algodClient, roundNumber, txnId, expectedValues) {
    expectFields(await findTransaction(algodClient, roundNumber, txnId), expectedValues);
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
    expectGlobalState,
    dumpGlobalState,
};