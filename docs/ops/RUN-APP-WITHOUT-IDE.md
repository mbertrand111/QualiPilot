# Lancer QualiPilot sans IDE

## Option 1 — Terminal (simple)

```powershell
cd C:\_git\QualiPilot
npm run setup   # première exécution
npm run dev
```

- Frontend : `http://localhost:5173`
- Backend : `http://localhost:3001/api/health`

## Option 2 — Script PowerShell (double-clic)

Créer `scripts/start-qualipilot.ps1` :

```powershell
Set-Location "C:\_git\QualiPilot"
npm run dev
```

Puis exécuter le script sans ouvrir un IDE.

## Option 3 — Mode production local

```powershell
cd C:\_git\QualiPilot
npm run build
npm --prefix backend run start
```

En parallèle, servir le frontend buildé (`npm --prefix frontend run preview`) ou via un serveur web dédié.

## Option 4 — Service Windows (recommandé usage quotidien)

Utiliser NSSM ou PM2 pour lancer le backend au démarrage machine :

- redémarrage automatique en cas de crash
- logs persistants
- pas besoin d'ouvrir de terminal/IDE

## Sécurité recommandée

Définir `QUALIPILOT_WRITE_API_KEY` dans `.env` pour protéger les routes d'écriture.

Exemple d'appel protégé :

```http
Authorization: Bearer <votre-cle>
```
