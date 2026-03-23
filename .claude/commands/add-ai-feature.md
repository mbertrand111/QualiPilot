# Add AI Feature

## Steps

1. Create or update `backend/src/routes/<feature>.ts`
   - Import `chat` from `../services/openai`
   - Accept user input from `req.body`
   - Call `chat()` with a well-crafted system + user prompt
   - Return the AI response as JSON
2. Register your route yourself — add these 2 lines in `backend/src/routes/index.ts`:
   ```typescript
   import <feature>Router from './<feature>';
   router.use('/', <feature>Router);
   ```
3. Create a Vitest test that mocks the `openai` module and verifies the response shape
4. Create or update `frontend/src/pages/<Feature>.tsx`
   - Form to capture user input
   - Call `apiFetch` from `../api/client`
   - Display the AI response
5. Register your page yourself — add this 1 line in `frontend/src/routes.ts`:
   ```typescript
   { path: '/<feature>', label: '<Feature Label>', component: lazy(() => import('./pages/<Feature>')) },
   ```
6. Return the list of created/modified files

## Constraints

- System prompt must be concise and task-specific
- Always handle the case where the AI returns an empty response
- Never expose the raw OpenAI error to the frontend — return `{ error: 'Service IA indisponible' }`
- Mock OpenAI in tests — never call the real API in tests

## Template

```typescript
// backend/src/routes/<feature>.ts
import { Router } from 'express';
import { chat } from '../services/openai';

const router = Router();

router.post('/<feature>', async (req, res) => {
  const { input } = req.body as { input: string };
  if (!input?.trim()) {
    return res.status(400).json({ error: 'input is required' });
  }
  try {
    const result = await chat([
      { role: 'system', content: 'You are a helpful assistant. [TODO: customize]' },
      { role: 'user', content: input },
    ]);
    res.json({ result });
  } catch {
    res.status(500).json({ error: 'Service IA indisponible' });
  }
});

export default router;
```
