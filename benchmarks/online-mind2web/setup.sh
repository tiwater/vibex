#!/bin/bash

# Exit on error
set -e

BENCHMARK_REPO="https://github.com/OSU-NLP-Group/Online-Mind2Web.git"
DIR_NAME="Online-Mind2Web"

if [ -d "$DIR_NAME" ]; then
  echo "Directory $DIR_NAME already exists. Skipping clone."
else
  echo "Cloning $BENCHMARK_REPO..."
  git clone "$BENCHMARK_REPO"
fi

echo "Setup complete. Please navigate to $DIR_NAME and follow the instructions in their README to install dependencies and run the benchmark."
echo "cd $DIR_NAME"
