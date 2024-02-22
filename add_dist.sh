#!/bin/bash

# Ensure a file path is provided
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <path_to_html_file>"
    exit 1
fi

FILE_PATH="$1"

# Create a backup of the original file
cp "$FILE_PATH" "$FILE_PATH.bak"

# Use sed to prepend '/dist' to the path if it's not already there
# Targeting src and href attributes
sed -i'.bak' -E 's@(src|href)="/([^"]+)"@\1="/dist/\2"@g' "$FILE_PATH"

echo "Processed $FILE_PATH. Original file backed up at $FILE_PATH.bak"
