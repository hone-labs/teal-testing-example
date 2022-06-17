const path = require("path");
const { expectFields } = require("../lib/utils");

const { executeTeal, success, failure } = require("./lib/utils");

const APPROVAL_PROGRAM = path.join(__dirname, "../../contracts/counter_approval.teal");

describe("teal-counter / simulated", () => {

    test("can initialise the counter value to X", async () => {

        const config = {
            "txn": {
                "ApplicationID": 0,
                "ApplicationArgs": {
                    "0": [ 22 ]
                }
            },
        };

        const result = await executeTeal(APPROVAL_PROGRAM, config);
        expect(success(result)).toBe(true);

        expectFields(result.appGlobals, {
            "0": {
                counterValue: {
                    type: "bigint",
                    value: 22,
                },
            },
        });        
    });

    test("can increment the counter", async () => {

        const config = {
            "appGlobals": {
                "0": {
                    "counterValue": 15         // Previous value.
                }
            },
            "txn": {
                "Sender": "creator",
                "ApplicationID": 1,
                "OnCompletion": 0,
                "ApplicationArgs": {
                    "0": "increment"
                }
            },
            "globals": {
                "CreatorAddress": "creator",
            },
        };

        const result = await executeTeal(APPROVAL_PROGRAM, config);
        expect(success(result)).toBe(true);

        expectFields(result.appGlobals, {
            "0": {
                counterValue: {
                    type: "bigint",
                    value: 16,
                },
            },
        });
    });    

    test("can decrement the counter", async () => {

        const config = {
            "appGlobals": {
                "0": {
                    "counterValue": 20         // Previous value.
                }
            },
            "txn": {
                "Sender": "creator",
                "ApplicationID": 1,
                "OnCompletion": 0,
                "ApplicationArgs": {
                    "0": "decrement"
                }
            },
            "globals": {
                "CreatorAddress": "creator",
            },
        };

        const result = await executeTeal(APPROVAL_PROGRAM, config);
        expect(success(result)).toBe(true);

        expectFields(result.appGlobals, {
            "0": {
                counterValue: {
                    type: "bigint",
                    value: 19,
                },
            },
        });
    });    

});