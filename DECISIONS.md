# DECISIONS.md

| Date | Question | Choice |
|---|---|---|
| 2026-09-22 | Python version for development | Using existing Python 3.14; Prophet is optional and off by default |
| 2026-09-22 | Session seed generation | Using hash of session_id string via Python's built-in hash + abs |
