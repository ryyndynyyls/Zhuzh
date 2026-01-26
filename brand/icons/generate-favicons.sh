#!/bin/bash
cd "$(dirname "$0")"
SOURCE="app-icon@2x.png"

if [ ! -f "$SOURCE" ]; then
    echo "Error: $SOURCE not found"
    exit 1
fi

echo "Generating favicons..."
convert "$SOURCE" -resize 16x16 favicon-16x16.png
convert "$SOURCE" -resize 32x32 favicon-32x32.png
convert "$SOURCE" -resize 180x180 apple-touch-icon.png
convert "$SOURCE" -resize 192x192 android-chrome-192x192.png
convert "$SOURCE" -resize 512x512 android-chrome-512x512.png
convert favicon-16x16.png favicon-32x32.png favicon.ico
echo "Done!"
