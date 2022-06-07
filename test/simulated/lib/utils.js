const { execute } = require("teal-interpreter");
const { readFile } = require("../../../scripts/lib/algo-utils");

//
// Helper file to execute TEAL code directly from a file.
//
async function executeTeal(tealFileName, config) {
    const code = await readFile(tealFileName);
    return await execute(code, config);
}

//
// Returns true if the evaluation of the TEAL code was successful.
//
function success(executionResult) {
    if (executionResult.stack.length !== 1) {
        return false;
    }

    const result = executionResult.stack[0];
    if (result.type !== "bigint") {
        return false;
    }

    if (result.value === 0n) {
        return false;
    }

    return true;               
}

//
// Returns true if the evaluation of the TEAL code was not successful.
//
function failure(executionResult) {
    return !success(executionResult);
}

module.exports = {
    executeTeal,
    success,
    failure,
};