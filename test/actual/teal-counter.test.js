const algosdk = require('algosdk');
const path = require("path");
const { expectTransaction, expectGlobalState } = require('./lib/utils');
const { signAndSubmitTransaction, readFile, deployApp } = require("../../scripts/lib/algo-utils");
const environment = require("../../scripts/environment");

const APPROVAL_PROGRAM = path.join(__dirname, "../../contracts/counter_approval.teal");
const CLEAR_PROGRAM = path.join(__dirname, "../../contracts/counter_clear.teal");

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

        // Deploy the smart contract.
        return await deployApp(
            algodClient,
            creatorAccount,
            await readFile(APPROVAL_PROGRAM),
            await readFile(CLEAR_PROGRAM),
            STANDARD_FEE,
            GLOBAL_BYTE_SLICES,
            GLOBAL_INTS,
            LOCAL_BYTE_SLICES,
            LOCAL_INTS,
            [
                algosdk.encodeUint64(initialValue),
            ],
            [],
            [],
            [],
            1
        );
    }

    //
    // Invokes a "method" in the teal counter.
    //
    async function invokeTealCounter(creatorAccount, appId, method) {

        const params = await algodClient.getTransactionParams().do();
        params.fee = 1000;
        params.flatFee = true;

        const callTxn = algosdk.makeApplicationNoOpTxn(
            creatorAccount.addr,
            params,
            appId,
            [
                new Uint8Array(Buffer.from(method)),
            ],
        );
    
        return await signAndSubmitTransaction(algodClient, creatorAccount, callTxn);
    }

    //
    // Invokes the "increment" method of the smart contract.
    //
    async function invokeIncrement(appId) {
        return await invokeTealCounter(creatorAccount, appId, "increment");
    } 

    //
    // Invokes the "decrement" method of the smart contract.
    //
    async function invokeDecrement(appId) {
        return await invokeTealCounter(creatorAccount, appId, "decrement");
    } 

});

