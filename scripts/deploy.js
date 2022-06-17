//
// This script deploys the contract to the Algorand blockchain.
//

const algosdk = require("algosdk");
const environment = require("./environment");
const { deployTealCounter } = require("./lib/utils");

async function main() {
    const creatorMnemonic = process.env.CREATOR_MNEMONIC;
    if (!creatorMnemonic) {
        throw new Error(`Please set CREATOR_MNEMONIC to the mnemonic for the Algorand account that creates the smart contract.`);
    }
    const creatorAccount = algosdk.mnemonicToSecretKey(creatorMnemonic);
    const algodClient = new algosdk.Algodv2(environment.token, environment.host, environment.port);

    // Deploy the smart contract.
    const { appId, appAddr } = await deployTealCounter(algodClient, creatorAccount, 0);

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
