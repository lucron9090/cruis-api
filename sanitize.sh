#!/bin/bash

# Script to sanitize sensitive data from documentation files before committing

echo "🔒 Sanitizing sensitive data from files..."

# Define the sensitive values to replace
CARD_NUMBER="1001600244772"
PUBLIC_KEY="S5dFutoiQg"
USERNAME="TruSpeedTrialEBSCO"
API_TOKEN_KEY_1="5JBOM"
API_TOKEN_KEY_2="diYfK"

# Replacements
CARD_PLACEHOLDER="YOUR_CARD_NUMBER"
PUBLIC_KEY_PLACEHOLDER="YOUR_PUBLIC_KEY"
USERNAME_PLACEHOLDER="YOUR_USERNAME"
API_TOKEN_PLACEHOLDER="YOUR_API_TOKEN"

# Files to sanitize (excluding .har files which are already in .gitignore)
FILES=(
    "README.md"
    "README_NEW.md"
    "USAGE.md"
    "API_ENDPOINTS.md"
    "PROJECT_COMPLETE.md"
    "TEST_INTERFACE.md"
    "TEST_RESULTS.md"
    "SETUP_SUMMARY.md"
    "QUICK_REFERENCE.md"
    "MOTOR_API_PROXY.md"
    "server.js"
    "index.js"
    "public/index.html"
    "public/test.html"
    "public/swagger.json"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  Sanitizing $file..."
        
        # Create backup
        cp "$file" "$file.backup"
        
        # Replace sensitive values
        sed -i '' "s/$CARD_NUMBER/$CARD_PLACEHOLDER/g" "$file"
        sed -i '' "s/$PUBLIC_KEY/$PUBLIC_KEY_PLACEHOLDER/g" "$file"
        sed -i '' "s/$USERNAME/$USERNAME_PLACEHOLDER/g" "$file"
        sed -i '' "s/$API_TOKEN_KEY_1/$API_TOKEN_PLACEHOLDER/g" "$file"
        sed -i '' "s/$API_TOKEN_KEY_2/$API_TOKEN_PLACEHOLDER/g" "$file"
        
        echo "    ✓ Done"
    fi
done

echo ""
echo "✅ Sanitization complete!"
echo ""
echo "📋 Backup files created with .backup extension"
echo "💡 Review the changes before committing"
echo "🗑️  To restore backups: for f in *.backup; do mv \"\$f\" \"\${f%.backup}\"; done"
echo ""
echo "⚠️  Remember to:"
echo "   1. Review all changes: git diff"
echo "   2. Make sure .har files are not tracked: git status"
echo "   3. Check .gitignore is working: git check-ignore *.har"
echo ""
