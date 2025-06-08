# 🥘 Planificateur de Repas Familiaux

La planification quotidienne des repas, la gestion des listes de courses et la prise en compte des besoins et préférences de chaque membre de la famille peuvent rapidement devenir un véritable casse-tête. Entre le manque de temps, la recherche d'inspiration et le souci de proposer une alimentation équilibrée, la gestion des repas familiaux est souvent perçue comme une corvée. C'est pour répondre à cette problématique que cette application a été conçue.

Notre solution est une application web intuitive et conviviale, pensée pour **simplifier la vie** de ceux qui gèrent l'alimentation du foyer. Elle a pour ambition de transformer la **gestion des repas** – les fameuses "questions de plat" – en une activité plus sereine, voire collaborative.

L'application s'adresse principalement aux **familles**, et plus particulièrement à la personne traditionnellement en charge de cette organisation : **"la maman"**, la grand-mère, ou toute personne responsable du foyer. L'objectif est de lui fournir un outil puissant mais simple d'utilisation, capable de l'assister efficacement dans toutes les étapes : de l'idée du menu à la génération de la liste de courses, en passant par la prise en compte des régimes spécifiques.

Le bénéfice principal de cette application est de rendre la **gestion des repas** moins chronophage et stressante. Elle vise à alléger la charge mentale associée à cette tâche, à favoriser la collaboration au sein de la famille pour le choix des menus, et à aider à une meilleure organisation générale, contribuant ainsi à réduire le gaspillage alimentaire et à promouvoir une alimentation adaptée aux besoins de chacun. En somme, elle a pour but de rendre la gestion des repas familiaux plus simple, plus organisée et moins contraignante.

---

## 🚀 Fonctionnalités principales

- 🔐 **Authentification sécurisée** (email + Google): Offre un accès protégé à l'application via une connexion par email ou un compte Google.
- 👨‍👩‍👧‍👦 **Gestion de familles**: Permet de créer un espace familial unique, d'inviter des membres et de centraliser la planification des repas pour tous.
- 🧾 **Planification des repas** à la semaine: Propose une interface claire pour organiser les menus de chaque jour de la semaine.
- 🍲 **Création et gestion de recettes** personnalisées: Permet aux utilisateurs d'ajouter leurs propres recettes, de les modifier et de les consulter facilement.
- 🛒 **Génération automatique de la liste de courses**: Calcule et compile intelligemment les ingrédients nécessaires en fonction des repas planifiés.
- ⏰ **Notifications par email**: Envoie des rappels pour les repas à venir ou des suggestions pour aider à la planification.
- 🧠 **Adaptation aux préférences alimentaires et allergies**: Permet de spécifier des préférences alimentaires et allergies pour chaque membre, afin d'aider à la sélection de repas adaptés.
- 📱 **Interface responsive** avec Material UI: Assure une expérience utilisateur optimale sur différents appareils (ordinateurs, tablettes, smartphones).
- 🌐 **Stockage cloud sécurisé** via Firebase: Conserve toutes les données de manière sûre et accessible depuis n'importe où.

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

## ✨ Fonctionnalités envisagées

- 🥦 **Gestion affinée des régimes et allergies**: Prise en compte détaillée des besoins nutritionnels spécifiques (sans gluten, végétarien, diabète, etc.) pour chaque membre de la famille.
- 🎤 **Saisie vocale**: Ajout de recettes, d'ingrédients à une recette, ou d'éléments à la liste de courses en utilisant la voix pour plus de rapidité et de confort.
- 💡 **Module de suggestion de recettes intelligent**: Propose des idées de repas basées sur les habitudes alimentaires, les ingrédients disponibles en stock, les préférences et les régimes.
- 📊 **Statistiques nutritionnelles**: Fournit des informations sur l'équilibre alimentaire des menus planifiés.
- 📤 **Export et partage avancé des menus et listes**: Permet d'exporter les plans de repas et les listes de courses en PDF, ou de les partager facilement avec d'autres personnes.
- 💬 **Chat familial pour s'organiser**: Un espace de discussion intégré pour que les membres de la famille puissent échanger sur les repas.
- 📆 **Intégration calendrier Google**: Synchronisation des menus planifiés avec l'agenda Google des utilisateurs.
- 📱 **Application mobile dédiée (React Native)**: Développement d'une application mobile native pour une expérience encore plus intégrée.
- 🤝 **Optimisation des achats groupés (type "Yangotisation")**: Fonctionnalité avancée pour permettre des achats groupés et bénéficier de meilleurs prix.
- 📸 **Reconnaissance d'images/texte pour listes de courses**: Importer une liste de courses depuis une photo ou un texte scanné.

---

## 💖 Notre Vision & Philosophie

Notre ambition est de **simplifier la vie** de chaque famille en transformant la planification des repas, souvent perçue comme une tâche ardue, en une expérience agréable et collaborative. Nous voulons créer un outil puissant, mais surtout **accessible à tous**, en particulier aux utilisateurs moins technophiles comme "la maman" ou "la personne en charge du foyer", qui jongle avec de multiples responsabilités.

L'application est pensée pour **réduire la charge mentale** liée à l'organisation des repas et pour lutter contre le gaspillage alimentaire en offrant une meilleure visibilité sur les besoins réels et les provisions. Nous croyons en une **alimentation consciente et adaptée**, où les besoins spécifiques de chacun sont pris en compte, favorisant ainsi le bien-être de tous les membres de la famille.

Nous visons une application qui s'adapte à vous, et non l'inverse. Une plateforme qui encourage la participation, facilite l'organisation et redonne du plaisir à la préparation des repas quotidiens.

---

## 👨‍👩‍👧‍👦 Auteurs

* ✍️ **SIGNIE CHENDJOU RYAN EMMANUEL** – Développeur principal
* 🧪 Collaborateurs à venir...

---

## 📄 Licence

Ce projet est sous licence MIT – libre d’utilisation, de modification et de diffusion.
