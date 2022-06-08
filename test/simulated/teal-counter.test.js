const path = require("path");

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

        // Only outputs a global for the current application.
        expect(Object.keys(result.appGlobals)).toEqual([ "0" ]);
        
        // Only outputs a single "value".
        const appGlobals = result.appGlobals["0"];
        expect(Object.keys(appGlobals)).toEqual([ "counterValue" ]);
        
        const value = appGlobals.counterValue;
        expect(value.type).toEqual("bigint");
        expect(value.value).toEqual(22n);

        expect(success(result)).toBe(true);
    });

    test("can increment the counter", async () => {

        const config = {
            "appGlobals": {
                "0": {
                    "counterValue": 15         // Previous value.
                }
            },
            "txn": {
                "ApplicationID": 1,
                "OnCompletion": 0,
                "ApplicationArgs": {
                    "0": "increment"
                }
            }
        };

        const result = await executeTeal(APPROVAL_PROGRAM, config);

        const value = result.appGlobals["0"].counterValue;
        expect(value.type).toEqual("bigint");
        expect(value.value).toEqual(16n);

        expect(success(result)).toBe(true);
    });    

    test("can decrement the counter", async () => {

        const config = {
            "appGlobals": {
                "0": {
                    "counterValue": 20         // Previous value.
                }
            },
            "txn": {
                "ApplicationID": 1,
                "OnCompletion": 0,
                "ApplicationArgs": {
                    "0": "decrement"
                }
            }
        };

        const result = await executeTeal(APPROVAL_PROGRAM, config);

        const value = result.appGlobals["0"].counterValue;
        expect(value.type).toEqual("bigint");
        expect(value.value).toEqual(19n);

        expect(success(result)).toBe(true);
    });    

});