# Add API Route

## Steps

1. Create `backend/src/routes/<resource>.ts` with a Router
2. Implement the handler with proper TypeScript types (no `any`)
3. Register your route yourself — add these 2 lines in `backend/src/routes/index.ts`:
   ```typescript
   import <resource>Router from './<resource>';
   router.use('/', <resource>Router);
   ```
4. Create `backend/src/routes/<resource>.test.ts` with a Vitest + supertest test covering the happy path
5. Return the list of created/modified files

## Constraints

- Use `async/await` — no raw `.then()` chains
- Error responses must be `{ error: string }` with the correct HTTP status code
- No hardcoded values — use env vars if configuration is needed
- Export the router as default

## Template

```typescript
// backend/src/routes/<resource>.ts
import { Router } from 'express';

const router = Router();

router.get('/<resource>', async (_req, res) => {
  try {
    // TODO: implement
    res.json({ data: [] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```
