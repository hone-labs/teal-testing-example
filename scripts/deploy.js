//
// This script deploys the contract to the Algorand blockchain.
//

const algosdk = require("algosdk");
const environment = require("./environment");
const { deployApp, readFile } = require("./lib/algo-utils");
const config = require("./config");

async function main() {
    const creatorMnemonic = process.env.CREATOR_MNEMONIC;
    if (!creatorMnemonic) {
        throw new Error(`Please set CREATOR_MNEMONIC to the mnemonic for the Algorand account that creates the smart contract.`);
    }
    const creatorAccount = algosdk.mnemonicToSecretKey(creatorMnemonic);
    const algodClient = new algosdk.Algodv2(environment.token, environment.host, environment.port);

    // Deploy the smart contract.
    const { appId, appAddr } = await deployApp(
        algodClient,
        creatorAccount,
        await readFile(config.APPROVAL_PROGRAM),
        await readFile(config.CLEAR_PROGRAM),
        config.STANDARD_FEE,
        config.GLOBAL_BYTE_SLICES,
        config.GLOBAL_INTS,
        config.LOCAL_BYTE_SLICES,
        config.LOCAL_INTS,
        [
            algosdk.encodeUint64(0),
        ],
        [],
        [],
        [],
        1
    );

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
