#!/usr/bin/env node

let app = require('commander')
let request = require('request')
let args = require('./src/cli/args')
const url = require('url')

args.addBuildCommand()

app
    .option(
        '-n, --subgraph-name <NAME>',
        'subgraph name'
    )
    .option(
        '--node <URL>[:PORT]',
        'graph node url'
    )

app.parse(process.argv)

if (!app.node || !app.subgraphName) {
    app.help()
}

let compiler = args.compilerFromArgs()

let requestUrl = new URL(app.node);
if (!requestUrl.port) {
    requestUrl.port = "8020"
}

compiler.compile()
    .then(
        function (ipfsHash) {
            if (ipfsHash === undefined) {
                console.log("compilation failed, not deploying")
                return
            }
            requestUrl.pathname += `subgraph_deploy/${app.name}/${ipfsHash}`
            request.post(requestUrl, {
                headers: {
                    'Content-Type': 'application/json'
                }
            },
                function (error, res, body) {
                    if (error) {
                        console.log("error sending json-rpc request " + error)
                    }
                })
        }
    )
