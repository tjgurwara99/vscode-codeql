#!/bin/bash

VERSIONS=$(gh api -H "Accept: application/vnd.github+json" /repos/github/codeql-cli-binaries/releases | jq -r '.[].tag_name' | head -2)

# we are exporting these variables so that we can access these variables in the workflow
export LATEST_VERSION=$(echo $VERSIONS | awk '{ print $1 }')
export PREVIOUS_VERSION=$(echo $VERSIONS | awk '{ print $2 }')

sed -i "s/$PREVIOUS_VERSION/$LATEST_VERSION/g" .github/workflows/main.yml
sed -i "s/$PREVIOUS_VERSION/$LATEST_VERSION/g" extensions/ql-vscode/src/vscode-tests/ensureCli.ts
