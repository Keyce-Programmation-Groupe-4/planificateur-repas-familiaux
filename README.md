# 🥘 Planificateur de Repas Familiaux

**Application web de gestion et de planification des repas au sein d’une famille.**  
Développée avec **React (JSX)**, **Firebase** (Auth, Firestore, Storage, Functions) et **Material UI**.

---

## 🚀 Fonctionnalités principales

- 🔐 **Authentification sécurisée** (email + Google)
- 👨‍👩‍👧‍👦 **Gestion de familles** : rejoindre, créer, quitter une famille
- 🧾 **Planification des repas** à la semaine
- 🍲 **Création et gestion de recettes** personnalisées
- 🛒 **Génération automatique de la liste de courses**
- ⏰ **Notifications par email** pour les rappels ou suggestions
- 🧠 **Adaptation aux préférences alimentaires et allergies**
- 📱 **Interface responsive** avec Material UI
- 🌐 **Stockage cloud sécurisé** via Firebase

---

## 🛠️ Technologies utilisées

| Frontend     | Backend            | Outils complémentaires     |
|--------------|--------------------|----------------------------|
| React (JSX)  | Firebase Functions | Material UI                |
| Vite         | Firebase Auth      | EmailJS ou nodemailer      |
| React Router | Firestore          | date-fns (gestion du temps) |
| @hello-pangea/dnd | Firebase Storage   | Vercel (déploiement possible) |

---

## 📁 Structure du projet

```

mon-planificateur-repas/
│
├── public/                 # Fichiers statiques
├── src/
│   ├── components/         # Composants réutilisables
│   │   └── planner/        # Planning hebdomadaire (par jour)
│   ├── contexts/           # AuthContext
│   ├── pages/              # Home, Login, Dashboard, etc.
│   ├── firebaseConfig.js   # Initialisation Firebase
│   ├── App.jsx             # Application principale
│   └── main.jsx            # Entrée Vite
│
├── functions/              # Fonctions Firebase (backend)
│   └── index.js            # Fonction onCall : createFamily, etc.
├── .firebaserc
├── firebase.json
├── package.json
└── README.md

````

---

## ⚙️ Installation locale

### 🔧 Prérequis
- Node.js ≥ 18
- npm ou yarn
- Compte Firebase + projet créé

### 📦 Installation

```bash
git clone https://github.com/Keyce-Programmation-Groupe-4/planificateur-repas-familiaux.git
cd planificateur-repas-familiaux
npm install
````

### 🔥 Configuration Firebase

1. Créez un fichier `src/firebaseConfig.js` :

```js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "xxx.firebaseapp.com",
  projectId: "xxx",
  storageBucket: "xxx.appspot.com",
  messagingSenderId: "xxx",
  appId: "xxx"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };
```

2. Activez :

   * Firebase Auth (email/Google)
   * Firestore (mode production)
   * Storage (si vous stockez des images)
   * Cloud Functions (si besoin de logique serveur)

---

## ▶️ Lancer l’app

```bash
npm run dev
```

L'application est accessible à l'adresse : `http://localhost:5173/`

---

## 🔒 Règles de sécurité Firestore (exemple)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /families/{familyId} {
      allow read, write: if request.auth != null;
    }
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

---

## 📤 Déploiement

### 🚀 Frontend (via Vercel)

* Connectez le repo à [https://vercel.com](https://vercel.com)
* Configurez les variables d’environnement si nécessaire

### 🔥 Backend (Firebase)

```bash
cd functions
npm install
firebase deploy --only functions
```

---

## 🤝 Contribuer

1. Fork le repo
2. Crée ta branche : `git checkout -b feature/ton-idee`
3. Commits : `git commit -am 'ajoute super idée'`
4. Push : `git push origin feature/ton-idee`
5. Crée une Pull Request

---

## 🧠 Idées futures

* 💬 Chat familial pour s’organiser
* 📆 Intégration calendrier Google
* 📊 Statistiques nutritionnelles
* 🧾 Export PDF ou partage du menu
* 📱 Application mobile React Native

---

## 👨‍👩‍👧‍👦 Auteurs

* ✍️ **SIGNIE CHENDJOU RYAN EMMANUEL** – Développeur principal
* 🧪 Collaborateurs à venir...

---

## 📄 Licence

Ce projet est sous licence MIT – libre d’utilisation, de modification et de diffusion.
