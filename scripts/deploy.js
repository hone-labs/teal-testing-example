//
// This script deploys the contract to the Algorand blockchain.
//

const algosdk = require("algosdk");
const environment = require("./environment");
const { deployApp, readFile } = require("./lib/algo-utils");

//
// Smart contract deployment parameters.
//
const GLOBAL_BYTE_SLICES = 3;
const GLOBAL_INTS = 1;
const LOCAL_BYTE_SLICES = 0;
const LOCAL_INTS = 0;
const APPROVAL_PROG = "contracts/counter_approval.teal";
const CLEAR_PROG = "contracts/counter_clear.teal";
const STANDARD_FEE = 1000;

async function main() {
    const creatorMnemonic = process.env.CREATOR_MNEMONIC;
    if (!creatorMnemonic) {
        throw new Error(`Please set CREATOR_MNEMONIC to the mnemonic for the Algorand account that creates the smart contract.`);
    }
    const creatorAccount = algosdk.mnemonicToSecretKey(creatorMnemonic);
    const algodClient = new algosdk.Algodv2(environment.token, environment.host, environment.port);

    // Deploy the smart contract.
    const appId = await deployApp(
        algodClient,
        creatorAccount,
        await readFile(APPROVAL_PROG),
        await readFile(CLEAR_PROG),
        STANDARD_FEE,
        GLOBAL_BYTE_SLICES,
        GLOBAL_INTS,
        LOCAL_BYTE_SLICES,
        LOCAL_INTS,
        [
            algosdk.encodeUint64(0),
        ],
        [],
        [],
        [],
        1
    );

    const appAddr = algosdk.getApplicationAddress(appId);    
 
    console.log(`Deployed:`);
    console.log(`- Contract id: ${appId}, address: ${appAddr}`);
}

main()
    .catch((err) => {
        console.error(`Failed:`);
        console.error((err && err.stack) || err);
        console.error(err.toString());
        console.error(err.message);
    });
