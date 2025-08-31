#!/bin/bash
# Build CSS with Tailwind using npx

echo "Building CSS with Tailwind..."
npx tailwindcss@3.4.17 -i ./src/app/globals.css -o ./public/output.css --minify

echo "CSS built successfully!"