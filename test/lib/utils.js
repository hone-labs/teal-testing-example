const algosdk = require("algosdk");

//
// Compare two arrays for equality.
//
function arrayEquals(a, b) {
    if (a.length !== b.length) {
        return false;
    }

    for (let i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) {
            return false;
        }
    }

    return true;
}

//
// Expect a single object to contain expected fields.
//
function _expectFields(parentPath, actual, expected) {
    for (const [key, expectedValue] of Object.entries(expected)) {
        let actualValue = actual[key];
        const expectedType = typeof expectedValue;
        if (expectedValue instanceof Uint8Array) {
            if (actualValue !== undefined && actualValue !== null) {
                if (actualValue.type === "Buffer" && expectedValue instanceof Uint8Array) {
                    if (arrayEquals(actualValue.data, Array.from(expectedValue))) {
                        continue; // All good.
                    }
                }
            }

            throw new Error(
                `Expected "${parentPath}.${key}" to be set to ${expectedValue}\r\nActual value: ${actualValue}\r\nExpected value: ${expectedValue}\r\nActual object: ${JSON.stringify(
                    actual,
                    null,
                    4
                )}`
            );
        }
        else if (expectedType === "object") {
            if (actualValue === null) {
                throw new Error(
                    `Expected "${parentPath}.${key}" to be set to ${expectedValue}\r\nActual value: null\r\nExpected value: ${expectedValue}\r\nActual object: ${JSON.stringify(
                        actual,
                        null,
                        4
                    )}`
                );
            }

            if (actualValue === undefined) {
                throw new Error(
                    `Expected "${parentPath}.${key}" to be set to ${expectedValue}\r\nActual value: undefined\r\nExpected value: ${expectedValue}\r\nActual object: ${JSON.stringify(
                        actual,
                        null,
                        4
                    )}`
                );
            }

            // Recurse to subobject.
            _expectFields(parentPath.length > 0 ? `${parentPath}.${key}` : key, actualValue, expectedValue);
        } else {
            if (actualValue === expectedValue) {
                // All good as is.
                continue;
            }

            if (actualValue !== undefined && actualValue !== null) {

                if (typeof(actualValue) === "string" && expectedType === "string") {
                    const addrValue = algosdk.encodeAddress(Buffer.from(actualValue, "base64"));
                    if (addrValue === expectedValue) {
                        continue; // All good.
                    }
                }

                if (actualValue.type === "Buffer" && expectedType === "string") {
                    const addrValue = algosdk.encodeAddress(Buffer.from(actualValue.data));
                    if (addrValue === expectedValue) {
                        continue; // All good.
                    }

                    const strValue = Buffer.from(actualValue.data, "base64").toString();
                    if (strValue === expectedValue) {
                        continue; // All good.
                    }
                    
                    const base64Value = Buffer.from(actualValue.data).toString("base64");
                    if (base64Value === expectedValue) {
                        continue; // All good.
                    }
                }
            }

            throw new Error(
                `Expected "${parentPath}.${key}" to be set to ${expectedValue}\r\nActual value: ${actualValue}\r\nExpected value: ${expectedValue}\r\nActual object: ${JSON.stringify(
                    actual,
                    null,
                    4
                )}`
            );
        }
    }
}

//
// Expects an object to contain the requested set of fields fields.
//
function expectFields(actual, expected) {

    if (actual === null) {
        throw new Error(`actual is null!`);
    }

    if (actual === undefined) {
        throw new Error(`actual is undefined!`);
    }

    const actualSerialized = JSON.parse(
        JSON.stringify(
            actual,
            (key, value) => {
                const type = typeof value;
                if (type === "bigint") {
                    return Number(value);
                }

                return value;
            },
            4
        )
    );    
    _expectFields("", actualSerialized, expected);
}

module.exports = {
    serializeData,
    expectFields,
};