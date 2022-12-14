#!/bin/bash

VERSIONS=$(gh api -H "Accept: application/vnd.github+json" /repos/github/codeql-cli-binaries/releases | jq '.[].tag_name' | head -2)

# we are exporting these variables so that we can access these variables in the workflow
export LATEST_VERSION=$(echo $VERSIONS | awk '{ print $1 }' | sed "s/\"//g")
export PREVIOUS_VERSION=$(echo $VERSIONS | awk '{ print $2 }' | sed "s/\"//g")

sed -i "s/$PREVIOUS_VERSION/$LATEST_VERSION/g" .github/workflows/main.yml
sed -i "s/$PREVIOUS_VERSION/$LATEST_VERSION/g" extensions/ql-vscode/src/vscode-tests/ensureCli.ts
