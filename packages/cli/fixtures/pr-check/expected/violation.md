<!-- atlasmith-pr-check -->
## Atlasmith architecture check

**2 architecture rule breaks found** (rules from `atlasmith.yml`). All of them are new in this pull request.

### Rules broken

1. `src/services/users.ts` line 2: module `services` imports module `ui` **(new)**
   - Why it matters: `services` lists the only modules it may use in `atlasmith.yml`, and `ui` is not on that list. Unplanned dependencies make the layers harder to test and replace.
   - How to fix: Reach `ui` through a module `services` is allowed to use, or add `ui` to the allow list of `services` in `atlasmith.yml` if the dependency is intended.
2. `src/ui/view.ts` line 1: module `ui` imports module `db` **(new)**
   - Why it matters: `atlasmith.yml` says `ui` must never depend on `db`. Crossing that boundary ties together parts that are meant to change independently.
   - How to fix: Move the code `ui` needs into a module it is allowed to use, or, if this dependency is intended, remove `db` from the deny list of `ui` in `atlasmith.yml`.

### Files affected by this change

5 files changed. 1 other file depends on them (up to 3 import hops away).

**Changed**

- `README.md` changed (not in the code graph, so no impact traced)
- `src/db/query.ts` changed
- `src/services/users.ts` changed
- `src/ui/labels.ts` added
- `src/ui/view.ts` changed

**May be affected**

- `src/main.ts` imports `src/ui/view.ts`

---
<sub>Scanned on the CI runner with `atlasmith scan --strict-architecture` for commit `0123456789ab`. No source code was uploaded anywhere. This comment updates on every push.</sub>
