# teal-testing-example

An example of automated testing TEAL smart contracts (for the Algorand Blockchain).

## Prerequisites

1. Clone this repository so you have a local copy.
2. Start an [Algorand Sandbox](https://github.com/algorand/sandbox).
3. Edit `scripts/environment.js` with the connection details for your Algorand Sandbox.
4. [Node.js](https://nodejs.org) must be installed to run the deployment and testing scripts in this repo. 

## Setup

To deploy the contract or run "actual" tests you need to know the mnemonic for the account in the Sandbox that will deploy the smart contract. You must set `CREATOR_MNEMONIC` environment vairable to the mnemonic like this:

```bash
export CREATOR_MNEMONIC=<mnemonic_for_the_creator_account>
```

Or on Windows:

```bash
set CREATOR_MNEMONIC=<mnemonic_for_the_creator_account>
```

Install dependencies:

```bash
npm install
```


## Deploy the smart contract

The smart contract in this repo can be deployed to your Sandbox by invoking:

```bash
npm run deploy
```

Note the app id for the deployed smart contract. You will need this later to interact with the contract and in the next section if you want to delete it.

## Delete the smart contract

If you want to remove the contract and clean up your Sandbox, invoke:

```bash
npm run delete -- <api-id>
```

## Run "actual" automated tests

Run automated tests against your Sandbox:

```bash
npm run test-actual
```

## Run "simulated" automated tests

Simulated tests don't require any Algorand virtual machine (AVM) to run. You don't need any Algorand Sandbox to to run these tests, they are simulated via a [teal-interpreter](https://www.npmjs.com/package/teal-interpreter).

Run them like this:

```bash
npm run test-simulated
```

Or more simply:

```bash
npm test
```
