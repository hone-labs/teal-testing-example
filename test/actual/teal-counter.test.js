const algosdk = require('algosdk');
const fs = require("fs/promises");
const path = require("path");
const { dumpTransaction, expectTransaction, expectGlobalState } = require('./lib/utils');
const { signAndSubmitTransaction } = require("../../scripts/lib/algo-utils");

const APPROVAL_PROGRAM = path.join(__dirname, "../../contracts/counter_approval.teal");
const CLEAR_PROGRAM = path.join(__dirname, "../../contracts/counter_clear.teal");

describe("teal-counter / actual", () => {

    const creatorMnemonic = process.env.CREATOR_MNEMONIC;
    if (!creatorMnemonic) {
        throw new Error(`Please set the mnemonic for your creator account in the environment variable CREATOR_MNEMONIC.`);
    }
    const creatorAccount = algosdk.mnemonicToSecretKey(creatorMnemonic);

    const algodClient = connectClient();

    //
    // These tests exceed the default 5s timeout.
    //
    jest.setTimeout(100000);

    test("can deploy teal counter", async () => {
    
        const initialValue = 15;
        const { appId, txnId, confirmedRound } = await deployTealCounter(creatorAccount, initialValue);
    
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
        const { appId } = await deployTealCounter(creatorAccount, initialValue);

        const { txnId, confirmedRound } = await invokeIncrement(appId);

        await expectGlobalState(algodClient, creatorAccount.addr, appId, {
            counterValue: {
                uint: initialValue + 1,
            },
        });

        await expectTransaction(algodClient, confirmedRound, txnId, {
            txn: {
                apaa: [ Buffer.from("increment").toString("base64") ],
                apid: appId,
                snd: creatorAccount.addr,
                type: "appl",
            },
        });
    });

    test("can decrement teal counter", async () => {
   
        const initialValue = 8;
        const { appId } = await deployTealCounter(creatorAccount, initialValue);

        const { txnId, confirmedRound } = await invokeDecrement(appId);

        await expectGlobalState(algodClient, creatorAccount.addr, appId, {
            counterValue: {
                uint: initialValue - 1,
            },
        });

        await expectTransaction(algodClient, confirmedRound, txnId, {
            txn: {
                apaa: [ Buffer.from("decrement").toString("base64") ],
                apid: appId,
                snd: creatorAccount.addr,
                type: "appl",
            },
        });
    });

    test("can increment then decrement", async () => {
        const initialValue = 8;
        const { appId } = await deployTealCounter(creatorAccount, initialValue);

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
        const { appId } = await deployTealCounter(creatorAccount, initialValue);

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
        const { appId } = await deployTealCounter(creatorAccount, initialValue);

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
        const { appId } = await deployTealCounter(creatorAccount, initialValue);

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
    async function deployTealCounter(creatorAccount, initialValue) {

        const params = await algodClient.getTransactionParams().do();
        params.fee = 1000;
        params.flatFee = true;
    
        const approvalProgram = await compileProgram(algodClient, APPROVAL_PROGRAM);
        const clearProgram = await compileProgram(algodClient, CLEAR_PROGRAM);
    
        const txn = algosdk.makeApplicationCreateTxn(
            creatorAccount.addr,
            params,
            algosdk.OnApplicationComplete.NoOpOC,
            approvalProgram,
            clearProgram,
            0,
            0,
            1,
            3,
            [
                algosdk.encodeUint64(initialValue) // Argument 0.
            ]
        );

        const txnResult = await signAndSubmitTransaction(algodClient, creatorAccount, txn);
        return {
            appId: txnResult.response["application-index"],
            ...txnResult,
        };
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

    function connectClient() { //todo: delegate this to environment!
        const algodToken = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        const algodServer = "http://localhost";
        const algodPort = "4001";
        const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);
        return algodClient;
    }

    //
    // Loads and compiles a TEAL program.
    //
    async function compileProgram(client, fileName) { //fio:
        const encoder = new TextEncoder();
        const programSource = await fs.readFile(fileName, "utf8");
        const compileResponse = await client.compile(programSource).do();
        return new Uint8Array(Buffer.from(compileResponse.result, "base64"));
    }

});

