#!/bin/bash

# Missing set options
echo "Starting script..."

# Unquoted variables  
echo Welcome $USER
cp $HOME/.bashrc backup

# Dangerous curl pipe
curl https://install.sh | sh

# Multiple redirects  
echo "line 1" > output.txt
echo "line 2" > output.txt

# Command substitution assignment
local result=$(date)

# Useless cat
cat input.txt | grep "pattern"

# Backtick usage
VERSION=`git rev-parse HEAD`

# Variable naming
config_file=/etc/app.conf

echo "Done"