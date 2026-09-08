# GUIDE DE DÉMARRAGE - SANTÉ+ BÉNIN

## Table des matières
1. [Prérequis](#prérequis)
2. [Installation](#installation)
3. [Démarrage](#démarrage)
4. [Configuration](#configuration)
5. [Architecture](#architecture)
6. [Endpoints API](#endpoints-api)
7. [Troubleshooting](#troubleshooting)

---

## Prérequis

### Option 1: Avec Docker (Recommandé)
- Docker >= 24.0
- Docker Compose >= 2.20

### Option 2: Installation locale
- Node.js >= 22 LTS
- Python >= 3.10
- PostgreSQL >= 16
- MongoDB >= 7
- Redis >= 7
- IPFS Kubo

---

## Installation

### Option 1: Avec Docker Compose (Recommandé)

```bash
# 1. Cloner le repository
git clone https://github.com/votre-repo/santeplus.git
cd santeplus

# 2. Copier le fichier .env
cp .env.example .env

# 3. Démarrer tous les services
docker-compose up -d

# 4. Vérifier que tout fonctionne
docker-compose ps

# Pour voir les logs
docker-compose logs -f api-gateway
```

### Option 2: Installation locale

```bash
# 1. Dépendances Node.js
npm install

# 2. Démarrer PostgreSQL (ex: avec homebrew macOS)
brew services start postgresql

# 3. Démarrer MongoDB
brew services start mongodb-community

# 4. Démarrer Redis
brew services start redis

# 5. Créer la base de données
createdb -U postgres santeplus
psql -U postgres santeplus < backend/init-db.sql

# 6. Lancer le serveur
npm run dev
```

---

## Démarrage

### Avec Docker
```bash
# Démarrer tous les services
docker-compose up -d

# Arrêter tous les services
docker-compose down

# Voir les logs
docker-compose logs -f

# Redémarrer un service
docker-compose restart api-gateway
```

### Localement
```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend (depuis une autre fenêtre)
npm run dev:frontend

# Application accessible sur http://localhost:5173
```

---

## Configuration

### Variables d'environnement (.env)

```env
# Serveur
NODE_ENV=development
PORT=3000

# Base de données
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=santeplus
POSTGRES_USER=santeplus
POSTGRES_PASSWORD=secure_password

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Bitcoin
BITCOIN_NETWORK=testnet
BITCOIN_RPC_HOST=http://localhost
BITCOIN_RPC_PORT=18332

# API Frontend
VITE_API_URL=http://localhost:3000/api
```

### Base de données

#### PostgreSQL
```bash
# Se connecter
psql -U santeplus -d santeplus

# Voir les tables
\dt

# Voir les utilisateurs
SELECT * FROM users;
```

#### MongoDB
```bash
# Se connecter
mongosh mongodb://santeplus:password@localhost:27017/santeplus

# Voir les collections
show collections

# Voir les dossiers médicaux
db.medical_dossiers.find()
```

#### Redis
```bash
# Se connecter
redis-cli

# Ping
ping

# Voir les clés
KEYS *
```

---

## Architecture

### Services
```
┌─────────────────────────────────────────────┐
│              API GATEWAY (3000)              │
├─────────────────────────────────────────────┤
│  AUTH  │ PATIENT │ DOCTOR │ HOSPITAL │ ...  │
├─────────────────────────────────────────────┤
│  PostgreSQL  │  MongoDB  │  Redis  │  IPFS  │
└─────────────────────────────────────────────┘
```

### Ports
- **API Gateway**: 3000
- **PostgreSQL**: 5432
- **MongoDB**: 27017
- **Redis**: 6379
- **IPFS**: 5001
- **InfluxDB**: 8086
- **Bitcoin**: 18332
- **LNbits**: 5000
- **Frontend**: 5173

---

## Endpoints API

### Authentification
```
POST   /api/auth/register/patient      # Inscription patient
POST   /api/auth/register/doctor       # Inscription médecin
POST   /api/auth/login                 # Connexion
POST   /api/auth/refresh               # Rafraîchir token
GET    /api/auth/me                    # Profil utilisateur
POST   /api/auth/logout                # Déconnexion
```

### Patients
```
GET    /api/patients/profile           # Profil patient
PUT    /api/patients/profile           # Mettre à jour profil
GET    /api/patients/record            # Dossier médical
POST   /api/patients/qr                # Générer QR code
GET    /api/patients/hospitals/nearby  # Hôpitaux proches
```

### Hôpitaux
```
GET    /api/hospitals                  # Liste hôpitaux
GET    /api/hospitals/:id              # Détails hôpital
GET    /api/hospitals/nearby           # Hôpitaux à proximité
POST   /api/hospitals                  # Créer hôpital (admin)
```

### Paiements
```
POST   /api/payments/invoice           # Créer facture
POST   /api/payments/pay               # Payer facture
GET    /api/payments/status/:id        # Statut paiement
GET    /api/payments/balance           # Solde wallet
```

Voir la [documentation complète de l'API](./API_DOCS.md)

---

## Authentification

### Flux de connexion
1. Utilisateur se connecte avec téléphone + mot de passe
2. Serveur valide et génère JWT (15 min) + Refresh Token (7 jours)
3. Frontend stocke les tokens dans localStorage
4. Client ajoute le JWT dans chaque requête: `Authorization: Bearer <token>`

### Exemple de requête authentifiée
```bash
curl -H "Authorization: Bearer eyJhbGc..." http://localhost:3000/api/patients/profile
```

### Rôles et permissions
- **Patient**: Accès à son profil, dossier, rendez-vous, paiements
- **Médecin**: Accès aux patients consentants, création consultations
- **Admin**: Gestion complète des utilisateurs et hôpitaux

---

## Monitoring

### Logs
```bash
# Voir les logs en temps réel
docker-compose logs -f api-gateway

# Voir les logs d'une ligne
docker-compose logs --tail 100 api-gateway
```

### Health Checks
```bash
# Vérifier que l'API est en ligne
curl http://localhost:3000/api/health

# Vérifier PostgreSQL
docker exec santeplus-postgres pg_isready

# Vérifier MongoDB
docker exec santeplus-mongodb mongosh --eval "db.adminCommand('ping')"
```

### Métriques (InfluxDB)
```bash
# Accéder à InfluxDB UI
http://localhost:8086

# Utilisateur: santeplus
# Mot de passe: (depuis .env)
```

---

## Troubleshooting

### API ne démarre pas
```bash
# 1. Vérifier les ports
lsof -i :3000

# 2. Vérifier la connexion à PostgreSQL
npm run test:db

# 3. Voir les erreurs
docker-compose logs api-gateway
```

### Base de données non accessible
```bash
# PostgreSQL
docker-compose down postgres
docker volume rm santeplus_postgres_data
docker-compose up -d postgres

# MongoDB
docker exec santeplus-mongodb mongosh --eval "db.adminCommand('ping')"
```

### Port déjà utilisé
```bash
# Modifier le port dans docker-compose.yml
# Ou tuer le processus:
kill -9 $(lsof -ti :3000)
```

### Problèmes de permission Docker
```bash
# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker $USER
newgrp docker
```

---

## Documentation supplémentaire

- [Architecture Frontend](./docs/ARCHITECTURE_FRONTEND.md)
- [Architecture Backend](./docs/ARCHITECTURE_BACKEND.md)
- [Architecture Bases de Données](./docs/ARCHITECTURE_DB.md)
- [API Documentation](./API_DOCS.md)
- [Sécurité](./docs/SECURITY.md)
- [Déploiement](./docs/DEPLOYMENT.md)

---

## Prochaines étapes

- [ ] Implémenter les microservices complets
- [ ] Ajouter les tests unitaires et d'intégration
- [ ] Configurer CI/CD (GitHub Actions)
- [ ] Déployer sur un serveur de production
- [ ] Intégrer Bitcoin et Lightning Network
- [ ] Implémenter l'IA (OpenAI)
- [ ] Configurer les notifications (Firebase)

---

## Support

Pour les questions ou problèmes:
- Email: dev@santeplus.bj
- Issues: https://github.com/votre-repo/issues
- Discussions: https://github.com/votre-repo/discussions

---

## Licence

Ce projet est sous licence MIT. Voir [LICENSE](./LICENSE) pour détails.

---

**Bonne chance avec Santé+ ! **
