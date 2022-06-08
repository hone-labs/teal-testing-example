//
// Smart contract deployment parameters.
//

const path = require("path");

module.exports = {
    GLOBAL_BYTE_SLICES: 3,
    GLOBAL_INTS: 1,
    LOCAL_BYTE_SLICES: 0,
    LOCAL_INTS: 0,
    APPROVAL_PROGRAM: path.join(__dirname, "../contracts/counter_approval.teal"),
    CLEAR_PROGRAM: path.join(__dirname, "../contracts/counter_clear.teal"),
    STANDARD_FEE: 1000,
};
