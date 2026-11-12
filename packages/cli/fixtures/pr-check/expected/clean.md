<!-- atlasmith-pr-check -->
## Atlasmith architecture check

**All clear.** This pull request breaks none of the architecture rules in `atlasmith.yml`.

### Files affected by this change

3 files changed. 2 other files depend on them (up to 3 import hops away).

**Changed**

- `src/db/query.ts` changed
- `src/ui/format.ts` added
- `src/ui/view.ts` changed

**May be affected**

- `src/main.ts` imports `src/ui/view.ts`
- `src/services/users.ts` imports `src/db/query.ts`

---
<sub>Scanned on the CI runner with `atlasmith scan --strict-architecture` for commit `0123456789ab`. No source code was uploaded anywhere. This comment updates on every push.</sub>
