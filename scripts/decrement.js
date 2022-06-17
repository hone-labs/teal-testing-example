//
// This script decrements the teal-counter.
//

const algosdk = require("algosdk");
const minimist = require("minimist");
const environment = require("./environment");
const { invokeDecrement } = require("./lib/utils");

const STANDARD_FEE = 1000; //todo: use this

async function main() {
    const creatorMnemonic = process.env.CREATOR_MNEMONIC;
    if (!creatorMnemonic) {
        throw new Error(`Please set CREATOR_MNEMONIC to the mnemonic for the Algorand account that creates the smart contract.`);
    }

    const argv = minimist(process.argv.slice(2));
    if (argv._.length !== 1) {
        throw new Error(`Expected 1 argument:\n\tnpm run increment -- <app-id>`);
    }

    const appId = parseInt(argv._[0]);
    const creatorAccount = algosdk.mnemonicToSecretKey(creatorMnemonic);
    const algodClient = new algosdk.Algodv2(environment.token, environment.host, environment.port); 

    await invokeDecrement(algodClient, creatorAccount, appId);

    console.log(`Decremented the teal-counter.`);
}

main()
    .catch((err) => {
        console.error(`Failed:`);
        console.error((err && err.stack) || err);
        console.error(err.toString());
        console.error(err.message);
    });
