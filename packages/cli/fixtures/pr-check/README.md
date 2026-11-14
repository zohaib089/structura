This directory holds three tiny repos for the PR comment test (src/pr-comment.test.ts).
base is the target branch; head-clean and head-violation are two pull request heads.
expected/ holds the exact comment text. Regenerate with PR_COMMENT_UPDATE=1 npm test.
