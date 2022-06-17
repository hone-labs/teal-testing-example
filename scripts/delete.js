//
// This script deletes the deployed app from the Algorand blockchain.
//

const algosdk = require("algosdk");
const minimist = require("minimist");
const environment = require("./environment");
const { deleteApp } = require("./lib/algo-utils");

const STANDARD_FEE = 1000;

async function main() {
    const creatorMnemonic = process.env.CREATOR_MNEMONIC;
    if (!creatorMnemonic) {
        throw new Error(`Please set CREATOR_MNEMONIC to the mnemonic for the Algorand account that creates the smart contract.`);
    }

    const argv = minimist(process.argv.slice(2));
    if (argv._.length !== 1) {
        throw new Error(`Expected 1 argument:\n\tnpm run delete -- <app-id>`);
    }

    const appId = parseInt(argv._[0]);
    const creatorAccount = algosdk.mnemonicToSecretKey(creatorMnemonic);
    const algodClient = new algosdk.Algodv2(environment.token, environment.host, environment.port);
    const deletedAppId = await deleteApp(algodClient, creatorAccount, appId, STANDARD_FEE);
    if (appId !== deletedAppId) {
        throw new Error(`The id of the deleted app (${deletedAppId}) is different to the requested app (${appId})`);
    }

    console.log(`Deleted application ${deletedAppId} from account ${creatorAccount.addr}`);
}

main()
    .catch((err) => {
        console.error(`Failed:`);
        console.error((err && err.stack) || err);
        console.error(err.toString());
        console.error(err.message);
    });
