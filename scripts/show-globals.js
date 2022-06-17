//
// This script shows the global state for the specified application.
//

const algosdk = require("algosdk");
const minimist = require("minimist");
const environment = require("./environment");
const { readGlobalState } = require("./lib/algo-utils");
const AsciiTable = require('ascii-table');

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

    const globals = await readGlobalState(algodClient, creatorAccount.addr, appId);

    const table = new AsciiTable('Globals')
    table.setHeading("Name", "Type", "Value");

    for (const [key, value] of Object.entries(globals))  {
        table.addRow(key, value.type, value.type === 2 ? value.uint : value.bytes);
    }
     
    console.log(table.toString());
}

main()
    .catch((err) => {
        console.error(`Failed:`);
        console.error((err && err.stack) || err);
        console.error(err.toString());
        console.error(err.message);
    });
