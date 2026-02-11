# VHS documentation: https://github.com/charmbracelet/vhs

Output demo.gif

# Terminal settings - optimized for readability
Set FontSize 24
Set Width 1600
Set Height 1000
Set Theme "Catppuccin Mocha"
Set Padding 40
Set TypingSpeed 30ms
Set PlaybackSpeed 0.8

# Title card
Type "# aitelier - Your AI atelier for fine-tuning LLMs 🎨"
Sleep 1s
Enter
Enter
Sleep 500ms

# Installation
Type "npm install -g aitelier"
Sleep 300ms
Enter
Sleep 1s
Type@500ms "✓ Installed aitelier v0.2.0"
Enter
Sleep 800ms
Enter

# Initialize project
Type "ait init"
Sleep 200ms
Enter
Sleep 1s

# Project name prompt
Type "customer-support-bot"
Sleep 400ms
Enter
Sleep 500ms

# Provider selection (Together.ai is already default)
Enter
Sleep 400ms

# Model selection (accept default)
Enter
Sleep 400ms

# System prompt
Type "You are a helpful customer support assistant."
Sleep 300ms
Enter
Sleep 1.2s

# Show initialization success
Type@300ms "✓ Project 'customer-support-bot' initialized successfully!"
Sleep 500ms
Enter
Type@300ms "  • .aitelier.json (project config)"
Sleep 200ms
Enter
Type@300ms "  • data/examples.jsonl (training data)"
Sleep 200ms
Enter
Sleep 1s
Enter

# Show the directory
Type "ls -la"
Sleep 200ms
Enter
Sleep 500ms
Type ".aitelier.json"
Enter
Type "data/"
Enter
Sleep 1s
Enter

# Add training examples (simulated for speed)
Type "# Adding 3 training examples..."
Sleep 500ms
Enter
Sleep 300ms

Type "echo 'Example 1: Password reset'"
Sleep 200ms
Enter
Sleep 400ms

Type "echo 'Example 2: Refund policy'"
Sleep 200ms
Enter
Sleep 400ms

Type "echo 'Example 3: Shipping info'"
Sleep 200ms
Enter
Sleep 1s
Enter

# Show stats - the star of the demo
Type "ait stats"
Sleep 200ms
Enter
Sleep 800ms

# Display colorful stats output (simulated)
Type@200ms "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Enter
Type@200ms " 📊 Dataset Health Overview"
Enter
Type@200ms "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Enter
Sleep 400ms
Enter

Type@200ms "Total examples: 25"
Enter
Type@200ms "Rated: 20 (80%)"
Enter
Type@200ms "  ████████████████████████████░░░░░░░░ 80%"
Enter
Sleep 600ms
Enter

Type@200ms " Rating Distribution (1-10):"
Enter
Sleep 200ms
Type@200ms "  10/10 │ ████████████████████      │  8  (40%)"
Enter
Type@200ms "   9/10 │ ███████████████           │  6  (30%)"
Enter
Type@200ms "   8/10 │ ██████████                │  4  (20%)"
Enter
Type@200ms "   7/10 │ ████                      │  2  (10%)"
Enter
Sleep 600ms
Enter

Type@200ms " Quality Analysis:"
Enter
Type@200ms "Threshold: 8/10"
Enter
Type@200ms "High-quality examples: 18 (90%)"
Enter
Sleep 600ms
Enter

Type@200ms " Readiness Check:"
Enter
Type@200ms "✓ Dataset is ready for training!"
Enter
Sleep 1s
Enter

# Show workflow summary
Type "# Complete workflow:"
Sleep 500ms
Enter
Type "ait init    # Initialize project"
Sleep 300ms
Enter
Type "ait add     # Collect examples"
Sleep 300ms
Enter
Type "ait rate    # Review quality"
Sleep 300ms
Enter
Type "ait split   # Create train/val split"
Sleep 300ms
Enter
Type "ait format  # Export to JSONL"
Sleep 300ms
Enter
Type "ait train   # Fine-tune model"
Sleep 300ms
Enter
Type "ait eval    # Validate results"
Sleep 800ms
Enter
Sleep 500ms
Enter

# Call to action
Type "# Get started:"
Sleep 300ms
Enter
Type "npm install -g aitelier"
Sleep 1s
Enter
Sleep 1s
