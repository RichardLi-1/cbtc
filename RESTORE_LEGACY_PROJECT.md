## Restore original project layout

If you want to revert to your previous structure:

1. Move scaffold out of the way (or delete it).
2. Move everything from `legacy_original/` back to repo root.

Example:

```bash
mv backend frontend docs .vscode README.md requirements.txt .gitignore .DS_Store legacy_original/ 2>/dev/null || true
mv legacy_original/* .
mv legacy_original/.[!.]* . 2>/dev/null || true
rmdir legacy_original
```

If hidden-file moves fail on your shell, move items manually (`ls -la legacy_original`).
