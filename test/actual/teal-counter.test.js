const algosdk = require('algosdk');
const fs = require("fs/promises");
const path = require("path");

const APPROVAL_PROGRAM = path.join(__dirname, "../../contracts/counter_approval.teal");
const CLEAR_PROGRAM = path.join(__dirname, "../../contracts/counter_clear.teal");

describe("teal-counter / actual", () => {

    const creatorMnemonic = process.env.CREATOR_MNEMONIC;
    if (!creatorMnemonic) {
        throw new Error(`Please set the mnemonic for your creator account in the environment variable CREATOR_MNEMONIC.`);
    }
    const creatorAccount = algosdk.mnemonicToSecretKey(creatorMnemonic);

    //
    // These tests exceed the default 5s timeout.
    //
    jest.setTimeout(100000);

    test("can increment teal counter", async () => {
    
        const initialValue = 15;
        const appId = await deployTealCounter(creatorAccount, initialValue);

        const initialGlobalState = await readGlobalState(creatorAccount, appId);
        expect(initialGlobalState).toEqual({ value: { bytes: '', type: 2, uint: initialValue } });

        await invokeTealCounter(creatorAccount, appId, "increment");

        const updatedGlobalState = await readGlobalState(creatorAccount, appId);
        expect(updatedGlobalState).toEqual({ value: { bytes: '', type: 2, uint: initialValue + 1 } });
    });

    test("can decrement teal counter", async () => {
   
        const initialValue = 8;
        const appId = await deployTealCounter(creatorAccount, initialValue);

        const initialGlobalState = await readGlobalState(creatorAccount, appId);
        expect(initialGlobalState).toEqual({ value: { bytes: '', type: 2, uint: initialValue } });

        await invokeTealCounter(creatorAccount, appId, "decrement");

        const updatedGlobalState = await readGlobalState(creatorAccount, appId);
        expect(updatedGlobalState).toEqual({ value: { bytes: '', type: 2, uint: initialValue - 1 } });
    });

    //
    // Deploys the Teal-counter to the sandbox.
    //
    async function deployTealCounter(creatorAccount, initialValue) {

        const algodClient = connectClient();

        const sender = creatorAccount.addr;   
    
        const params = await algodClient.getTransactionParams().do();
        params.fee = 1000;
        params.flatFee = true;
    
        const approvalProgram = await compileProgram(algodClient, APPROVAL_PROGRAM);
        const clearProgram = await compileProgram(algodClient, CLEAR_PROGRAM);
    
        const txn = algosdk.makeApplicationCreateTxn(
            sender,
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
    
        const txnId = txn.txID().toString();
        const signedTxn = txn.signTxn(creatorAccount.sk);
        await algodClient.sendRawTransaction(signedTxn).do();
        await waitForConfirmation(algodClient, txnId, 4);
        const transactionResponse = await algodClient.pendingTransactionInformation(txnId).do();
        const appId = transactionResponse['application-index'];
        return appId;
    }

    //
    // Invokes a "method" in the teal counter.
    //
    async function invokeTealCounter(creatorAccount, appId, method) {

        const algodClient = connectClient();

        const sender = creatorAccount.addr;   

        const params = await algodClient.getTransactionParams().do();
    
        params.fee = 1000;
        params.flatFee = true;

        const callTxn = algosdk.makeApplicationNoOpTxn(
            sender,
            params,
            appId,
            [
                new Uint8Array(Buffer.from(method)),
            ],
        );
    
        const callTxnId = callTxn.txID().toString();
        const signedCallTxn = callTxn.signTxn(creatorAccount.sk);
        await algodClient.sendRawTransaction(signedCallTxn).do();
        await waitForConfirmation(algodClient, callTxnId, 4);            
        await algodClient.pendingTransactionInformation(callTxnId).do();
   
    }

    function connectClient() {
        const algodToken = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        const algodServer = "http://localhost";
        const algodPort = "4001";
        const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);
        return algodClient;
    }

    //
    // Loads and compiles a TEAL program.
    //
    async function compileProgram(client, fileName) {
        const encoder = new TextEncoder();
        const programSource = await fs.readFile(fileName, "utf8");
        const compileResponse = await client.compile(programSource).do();
        return new Uint8Array(Buffer.from(compileResponse.result, "base64"));
    }

    // read global state of application
    // https://developer.algorand.org/docs/get-details/dapps/smart-contracts/frontend/apps/#read-state
    async function readGlobalState(account, index) {

        const algodClient = connectClient();

        const output = {};
        const accountInfoResponse = await algodClient.accountInformation(account.addr).do();
        for (let i = 0; i < accountInfoResponse['created-apps'].length; i++) { 
            if (accountInfoResponse['created-apps'][i].id == index) {
                for (let n = 0; n < accountInfoResponse['created-apps'][i]['params']['global-state'].length; n++) {
                    const globalVariable = accountInfoResponse['created-apps'][i]['params']['global-state'][n]
                    const name = Buffer.from(globalVariable.key, 'base64').toString();
                    output[name] = globalVariable.value;
                }
            }
        }
        return output;
    }

    /**
     * Wait until the transaction is confirmed or rejected, or until 'timeout'
     * number of rounds have passed.
     * @param {algosdk.Algodv2} algodClient the Algod V2 client
     * @param {string} txId the transaction ID to wait for
     * @param {number} timeout maximum number of rounds to wait
     * @return {Promise<*>} pending transaction information
     * @throws Throws an error if the transaction is not confirmed or rejected in the next timeout rounds
     */
    const waitForConfirmation = async function (algodClient, txId, timeout) {
        if (algodClient == null || txId == null || timeout < 0) {
            throw new Error("Bad arguments");
        }

        const status = (await algodClient.status().do());
        if (status === undefined) {
            throw new Error("Unable to get node status");
        }

        const startround = status["last-round"] + 1;
        let currentround = startround;

        while (currentround < (startround + timeout)) {
            const pendingInfo = await algodClient.pendingTransactionInformation(txId).do();
            if (pendingInfo !== undefined) {
                if (pendingInfo["confirmed-round"] !== null && pendingInfo["confirmed-round"] > 0) {
                    //Got the completed Transaction
                    return pendingInfo;
                } else {
                    if (pendingInfo["pool-error"] != null && pendingInfo["pool-error"].length > 0) {
                        // If there was a pool error, then the transaction has been rejected!
                        throw new Error("Transaction " + txId + " rejected - pool error: " + pendingInfo["pool-error"]);
                    }
                }
            }
            await algodClient.statusAfterBlock(currentround).do();
            currentround++;
        }
        throw new Error("Transaction " + txId + " not confirmed after " + timeout + " rounds!");
    };
});

