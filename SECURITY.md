# 🔒 Security Guide - Before Pushing to GitHub

## ⚠️ Important: Remove Sensitive Data

This repository contains examples with **real credentials** that must be sanitized before pushing to GitHub.

## Sensitive Data to Remove

### 1. Library Card Numbers
- **Found in**: Documentation files, test interface, examples
- **Example**: `1001600244772`
- **Replace with**: `YOUR_CARD_NUMBER` or `your_library_card_number_here`

### 2. API Keys and Tokens
- **Found in**: Test results, HAR files
- **Examples**: `S5dFutoiQg`, `5JBOM`, `diYfK`
- **Replace with**: `YOUR_PUBLIC_KEY`, `YOUR_API_TOKEN`

### 3. Usernames
- **Found in**: Test results, examples
- **Example**: `TruSpeedTrialEBSCO`
- **Replace with**: `YOUR_USERNAME`

### 4. Session IDs
- **Found in**: Test results, logs
- **Example**: `a270beb8-ed3b-4982-bae2-def882c3efcb`
- **Replace with**: `YOUR_SESSION_ID` or remove from examples

### 5. HAR Files
- **Files**: `*.har` (contain full request/response data including cookies)
- **Action**: **DO NOT COMMIT** - Already in `.gitignore`

## 🛠️ Quick Sanitization

### Option 1: Use the Sanitization Script (Recommended)

```bash
# Run the sanitization script
./sanitize.sh

# Review changes
git diff

# If satisfied, commit
git add .
git commit -m "Initial commit with sanitized data"
```

### Option 2: Manual Sanitization

1. **Search for sensitive data**:
```bash
grep -r "1001600244772" . --exclude-dir=node_modules
grep -r "S5dFutoiQg" . --exclude-dir=node_modules
```

2. **Replace in each file** using your editor's find/replace feature

3. **Verify no secrets remain**:
```bash
git diff
```

## 📋 Files Requiring Sanitization

The following files contain example credentials:

- ✏️ `README.md` - Replace card number in examples
- ✏️ `README_NEW.md` - Replace credentials in examples
- ✏️ `API_ENDPOINTS.md` - Replace card number
- ✏️ `PROJECT_COMPLETE.md` - Replace credentials
- ✏️ `TEST_RESULTS.md` - Replace test credentials
- ✏️ `SETUP_SUMMARY.md` - Replace card number
- ✏️ `QUICK_REFERENCE.md` - Replace card number
- ✏️ `TEST_INTERFACE.md` - Replace card number
- ✏️ `MOTOR_API_PROXY.md` - Replace credentials
- ✏️ `USAGE.md` - Replace card number
- ✏️ `server.js` - Replace example card number in console output
- ✏️ `index.js` - Replace example card number
- ✏️ `public/index.html` - Replace pre-filled card number
- ✏️ `public/test.html` - Replace pre-filled card number
- ✏️ `public/swagger.json` - Replace example card number
- ❌ `*.har` files - **DO NOT COMMIT** (already in .gitignore)

## 🚫 Files to NEVER Commit

These files are already in `.gitignore`:

```
*.har                          # HTTP Archive files (contain full requests/responses)
Traffic-Capture-*.har          # Traffic capture files
sites.motor.com.har            # Motor site traffic
motor*.har                     # Any motor-related HAR files
.env                           # Environment variables
node_modules/                  # Dependencies
*.log                          # Log files
```

## ✅ Pre-Commit Checklist

Before running `git push`:

- [ ] Run `./sanitize.sh` or manually replace all sensitive data
- [ ] Verify `.gitignore` includes `*.har` files
- [ ] Check no `.har` files are staged: `git status | grep .har`
- [ ] Review all changes: `git diff`
- [ ] Verify no real credentials in staged files: `git diff --cached | grep -i "1001600244772\|S5dFutoiQg"`
- [ ] Ensure `.env.example` exists (template only, no real values)
- [ ] Real `.env` file is in `.gitignore` (if you create one)

## 🔐 Using Environment Variables

Instead of hardcoding credentials, use environment variables:

1. **Copy the template**:
```bash
cp .env.example .env
```

2. **Edit `.env` with your real credentials**:
```bash
CARD_NUMBER=your_real_card_number_here
```

3. **Update server.js to use environment variables** (optional enhancement):
```javascript
require('dotenv').config();
const cardNumber = process.env.CARD_NUMBER || req.body.cardNumber;
```

4. **Never commit `.env`** - It's already in `.gitignore`

## 🚨 If You Accidentally Commit Secrets

If you've already committed sensitive data:

1. **Don't just remove it in a new commit** - it's still in git history!

2. **Use BFG Repo-Cleaner or git-filter-branch**:
```bash
# Install BFG
brew install bfg

# Remove sensitive data from history
bfg --replace-text passwords.txt

# Force push (⚠️ dangerous if others have cloned)
git push --force
```

3. **Rotate all exposed credentials immediately**:
   - Get a new library card number if possible
   - Contact EBSCO support if needed

## 📚 Additional Resources

- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [git-secrets](https://github.com/awslabs/git-secrets) - Prevent committing secrets

## 🎯 Safe to Commit

These files are safe to commit as-is (no secrets):

- ✅ `package.json`
- ✅ `server.js` (after sanitization)
- ✅ `.gitignore`
- ✅ `.env.example` (template only)
- ✅ `SECURITY.md` (this file)
- ✅ All documentation (after sanitization)

## 💡 Best Practices

1. **Never commit**:
   - Real credentials
   - HAR files
   - `.env` files
   - Session IDs
   - Auth tokens

2. **Always use**:
   - `.env.example` for templates
   - Placeholder values in documentation
   - Environment variables for secrets
   - `.gitignore` for sensitive files

3. **Before each commit**:
   - Run `git diff --cached`
   - Search for patterns: `git grep -i "password\|token\|secret\|key"`
   - Review all changes manually

---

**Remember**: Once pushed to GitHub, data is considered public even if you delete it later!
