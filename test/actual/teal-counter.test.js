const algosdk = require('algosdk');
const { expectTransaction, expectGlobalState } = require('./lib/utils');
const tealCounter = require("../../scripts/lib/utils");
const environment = require("../../scripts/environment");

const config = require("../../scripts/config");

describe("teal-counter / actual", () => {

    const creatorMnemonic = process.env.CREATOR_MNEMONIC;
    if (!creatorMnemonic) {
        throw new Error(`Please set CREATOR_MNEMONIC to the mnemonic for the Algorand account that creates the smart contract.`);
    }
    const creatorAccount = algosdk.mnemonicToSecretKey(creatorMnemonic);
    const algodClient = new algosdk.Algodv2(environment.token, environment.host, environment.port);

    //
    // These tests exceed the default 5s timeout.
    //
    jest.setTimeout(100000);

    test("can deploy teal counter", async () => {
    
        const initialValue = 15;
        const { appId, txnId, confirmedRound } = await deployTealCounter(initialValue);
    
        await expectGlobalState(algodClient, creatorAccount.addr, appId, {
            counterValue: {
                uint: initialValue,
            },
        });
    
        await expectTransaction(algodClient, confirmedRound, txnId, {
            txn: {
                apaa: [ algosdk.encodeUint64(initialValue) ],
                snd: creatorAccount.addr,
                type: "appl",
            },
        });
    });
    
    test("can increment teal counter", async () => {
    
        const initialValue = 15;
        const { appId } = await deployTealCounter(initialValue);

        const { txnId, confirmedRound } = await invokeIncrement(appId);

        await expectGlobalState(algodClient, creatorAccount.addr, appId, {
            counterValue: {
                uint: initialValue + 1,
            },
        });

        await expectTransaction(algodClient, confirmedRound, txnId, {
            txn: {
                apaa: [ "increment" ],
                apid: appId,
                snd: creatorAccount.addr,
                type: "appl",
            },
        });
    });

    test("can decrement teal counter", async () => {
   
        const initialValue = 8;
        const { appId } = await deployTealCounter(initialValue);

        const { txnId, confirmedRound } = await invokeDecrement(appId);

        await expectGlobalState(algodClient, creatorAccount.addr, appId, {
            counterValue: {
                uint: initialValue - 1,
            },
        });

        await expectTransaction(algodClient, confirmedRound, txnId, {
            txn: {
                apaa: [ "decrement" ],
                apid: appId,
                snd: creatorAccount.addr,
                type: "appl",
            },
        });
    });

    test("can increment then decrement", async () => {
        const initialValue = 8;
        const { appId } = await deployTealCounter(initialValue);

        await invokeIncrement(appId);
        await invokeDecrement(appId);

        await expectGlobalState(algodClient, creatorAccount.addr, appId, {
            counterValue: {
                uint: initialValue, // Back to original value.
            },
        });
    });

    test("can decrement then increment", async () => {
        const initialValue = 8;
        const { appId } = await deployTealCounter(initialValue);

        await invokeDecrement(appId);
        await invokeIncrement(appId);

        await expectGlobalState(algodClient, creatorAccount.addr, appId, {
            counterValue: {
                uint: initialValue, // Back to original value.
            },
        });
    });

    test("can increment x2", async () => {
        const initialValue = 8;
        const { appId } = await deployTealCounter(initialValue);

        await invokeIncrement(appId);
        await invokeIncrement(appId);

        await expectGlobalState(algodClient, creatorAccount.addr, appId, {
            counterValue: {
                uint: initialValue + 2,
            },
        });
    });

    test("can decrement x2", async () => {
        const initialValue = 8;
        const { appId } = await deployTealCounter(initialValue);

        await invokeDecrement(appId);
        await invokeDecrement(appId);

        await expectGlobalState(algodClient, creatorAccount.addr, appId, {
            counterValue: {
                uint: initialValue - 2,
            },
        });
    });

    //
    // Deploys the Teal-counter to the sandbox.
    //
    async function deployTealCounter(initialValue) {
        return await tealCounter.deployTealCounter(algodClient, creatorAccount, initialValue);
    }

    //
    // Invokes the "increment" method of the smart contract.
    //
    async function invokeIncrement(appId) {
        return await tealCounter.invokeIncrement(algodClient, creatorAccount, appId);
    } 

    //
    // Invokes the "decrement" method of the smart contract.
    //
    async function invokeDecrement(appId) {
        return await tealCounter.invokeDecrement(algodClient, creatorAccount, appId);
    } 

});


