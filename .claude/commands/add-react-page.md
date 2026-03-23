# Add React Page

## Steps

1. Create `frontend/src/pages/<Page>.tsx`
   - Functional component, exported as named export
   - Use `apiFetch` from `../api/client` for backend calls
   - Handle loading and error states
2. Register your page yourself — add this 1 line in `frontend/src/routes.ts`:
   ```typescript
   { path: '/<page-name>', label: '<Page Label>', component: lazy(() => import('./pages/<Page>')) },
   ```
3. Write a basic Vitest + Testing Library test in `frontend/src/pages/<Page>.test.tsx`
4. Return the list of created/modified files

## Constraints

- No inline styles unless absolutely necessary — prefer CSS classes or a `<style>` block
- Always show a loading indicator during async operations
- Always handle error state with a user-friendly message (not a raw error object)
- No `any` types

## Template

```tsx
// frontend/src/pages/<Page>.tsx
import { useState } from 'react';
import { apiFetch } from '../api/client';

export function PageName() {  // TODO: rename to your feature (e.g. Summarize, Generate...)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function handleSubmit(input: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ result: string }>('/api/<endpoint>', {
        method: 'POST',
        body: { input },
      });
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* TODO: implement UI */}
      {loading && <p>Chargement...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {result && <p>{result}</p>}
    </div>
  );
}
```
