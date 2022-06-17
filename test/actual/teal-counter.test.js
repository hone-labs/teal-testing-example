const algosdk = require("algosdk");
const testingUtils = require("./lib/utils");
const tealCounter = require("../../scripts/lib/utils");
const algoUtils = require("../../scripts/lib/algo-utils");
const environment = require("../../scripts/environment");

const config = require("../../scripts/config");

describe("teal-counter / actual", () => {

    const faucetMnemonic = process.env.FAUCET_MNEMONIC;
    if (!faucetMnemonic) {
        throw new Error(`Please set FAUCET_MNEMONIC to the mnemonic to an Algorand account that is used to create/fund testing accounts.`);
    }
    const faucetAccount = algosdk.mnemonicToSecretKey(faucetMnemonic);
    const algodClient = new algosdk.Algodv2(environment.token, environment.host, environment.port);

    //
    // Set to the account that deploys the contract for each test.
    //
    let creatorAccount; 

    //
    // Set to the "application id" for the deployed contract for each test.
    //
    let appId;

    //
    // These tests exceed the default 5s timeout.
    //
    jest.setTimeout(100000);

    test("creator can deploy teal counter", async () => {
    
        const initialValue = 15;
        const { appId, txnId, confirmedRound, creatorAccount } = await creatorDeploysCounter(initialValue);
    
        await expectGlobalState({
            counterValue: {
                uint: initialValue,
            },
        });
    
        await expectTransaction(confirmedRound, txnId, {
            txn: {
                apaa: [ algosdk.encodeUint64(initialValue) ],
                snd: creatorAccount.addr,
                type: "appl",
            },
        });
    });
    
    test("creator can increment teal counter", async () => {
    
        const initialValue = 15;
        const { appId, creatorAccount } = await creatorDeploysCounter(initialValue);

        const { txnId, confirmedRound } = await creatorIncrementsCounter();

        await expectGlobalState({
            counterValue: {
                uint: initialValue + 1,
            },
        });

        await expectTransaction(confirmedRound, txnId, {
            txn: {
                apaa: [ "increment" ],
                apid: appId,
                snd: creatorAccount.addr,
                type: "appl",
            },
        });
    });

    test("creator can decrement teal counter", async () => {
   
        const initialValue = 8;
        const { appId, creatorAccount } = await creatorDeploysCounter(initialValue);

        const { txnId, confirmedRound } = await creatorDecrementsCounter();

        await expectGlobalState({
            counterValue: {
                uint: initialValue - 1,
            },
        });

        await expectTransaction(confirmedRound, txnId, {
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
        await creatorDeploysCounter(initialValue);

        await creatorIncrementsCounter();
        await creatorDecrementsCounter();

        await expectGlobalState({
            counterValue: {
                uint: initialValue, // Back to original value.
            },
        });
    });

    test("can decrement then increment", async () => {
        const initialValue = 8;
        await creatorDeploysCounter(initialValue);

        await creatorDecrementsCounter();
        await creatorIncrementsCounter();

        await expectGlobalState({
            counterValue: {
                uint: initialValue, // Back to original value.
            },
        });
    });

    test("can increment x2", async () => {
        const initialValue = 8;
        await creatorDeploysCounter(initialValue);

        await creatorIncrementsCounter();
        await creatorIncrementsCounter();

        await expectGlobalState({
            counterValue: {
                uint: initialValue + 2,
            },
        });
    });

    test("can decrement x2", async () => {
        const initialValue = 8;
        await creatorDeploysCounter(initialValue);

        await creatorDecrementsCounter();
        await creatorDecrementsCounter();

        await expectGlobalState({
            counterValue: {
                uint: initialValue - 2,
            },
        });
    });

    test("only the creator can increment", async () => {
        
        await creatorDeploysCounter(0);

        // Create a temporary testing account.
        const userAccount = await createFundedAccount();

        // Some other user attempts to increment the counter...
        await expect(() => userIncrementsCounter(userAccount))
            .rejects
            .toThrow(); // ... and it throws an error.
    });

    test("only the creator can decrement", async () => {
        
        await creatorDeploysCounter(0);

        await creatorIncrementsCounter();

        // Create a temporary testing account.
        const userAccount = await createFundedAccount();

        // Some other user attempts to decrement the counter...
        await expect(() => userDecrementsCounter(userAccount))
            .rejects
            .toThrow(); // ... and it throws an error.
    });

    //
    // Deploys the Teal-counter to the sandbox.
    //
    async function creatorDeploysCounter(initialValue) {
        creatorAccount = await createFundedAccount();
        const result = await tealCounter.deployTealCounter(algodClient, creatorAccount, initialValue);
        appId = result.appId;

        return {
            ...result,
            creatorAccount,
        };
    }

    //
    // The creator invokes the "increment" method of the smart contract.
    //
    async function creatorIncrementsCounter() {
        if (!creatorAccount || !appId) {
            throw new Error(`Contract has not been deployed, please call "creatorDeploysCounter".`);
        }
        return await userIncrementsCounter(creatorAccount, appId);
    } 

    //
    // The creator invokes the "decrement" method of the smart contract.
    //
    async function creatorDecrementsCounter() {
        if (!creatorAccount || !appId) {
            throw new Error(`Contract has not been deployed, please call "creatorDeploysCounter".`);
        }
        return await userDecrementsCounter(creatorAccount, appId);
    } 

    //
    // Some user invokes the "increment" method of the smart contract.
    //
    async function userIncrementsCounter(userAccount) {
        if (!appId) {
            throw new Error(`Contract has not been deployed, please call "creatorDeploysCounter".`);
        }
        return await tealCounter.invokeIncrement(algodClient, userAccount, appId);
    } 

    //
    // Some user invokes the "decrement" method of the smart contract.
    //
    async function userDecrementsCounter(userAccount) {
        if (!appId) {
            throw new Error(`Contract has not been deployed, please call "creatorDeploysCounter".`);
        }
        return await tealCounter.invokeDecrement(algodClient, userAccount, appId);
    } 

    //
    // Creates a funded account we cause for testing.
    //
    async function createFundedAccount() {
        return await algoUtils.createFundedAccount(algodClient, faucetAccount, 1_000_000, 1_000);
    }    

    //
    // Checks that the global state of the contract matches the expected fields.
    //
    async function expectGlobalState(expectedFields) {
        await testingUtils.expectGlobalState(algodClient, creatorAccount.addr, appId, expectedFields);
    }

    //
    // Checks that a transaction commitetd to the blockchain matches the expected fields.
    //
    async function expectTransaction(confirmedRound, txnId, expectedFields) {
        await testingUtils.expectTransaction(algodClient, confirmedRound, txnId, expectedFields);
    }
});


