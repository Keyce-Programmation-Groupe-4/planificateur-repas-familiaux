"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Typography,
  Box,
  CircularProgress,
  Alert,
  useTheme,
  alpha,
  Fade,
  Stack,
  TextField,
  IconButton,
  Paper,
  List,
  ListItem,
  Avatar,
  Skeleton,
  useMediaQuery,
  Tooltip,
} from "@mui/material"
import SendIcon from "@mui/icons-material/Send"
import CloseIcon from "@mui/icons-material/Close"
import SmartToyIcon from '@mui/icons-material/SmartToy'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import MicIcon from '@mui/icons-material/Mic'
import StopIcon from '@mui/icons-material/Stop'
import { differenceInYears } from "date-fns"
import ReactMarkdown from 'react-markdown' // Ajout de react-markdown
import rehypeSanitize from 'rehype-sanitize' // Pour sécuriser le rendu Markdown
import { githubLight } from '@uiw/codemirror-theme-github' // Pour styliser les blocs de code (optionnel)
import CodeMirror from '@uiw/react-codemirror' // Pour rendre les blocs de code

// --- Constantes et Fonctions Utilitaires pour le Chatbot ---
const GEMINI_API_KEY = "AIzaSyDfu0Q9IKDvQu5ewtsG7xnh43iebNDDuyU"; // REMPLACEZ PAR VOTRE CLÉ API
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

// Fonction pour générer le contexte utilisateur pour le chatbot
const generateUserContext = (userData, familyData, familyMembers) => {
  if (!userData) return "";
  let context = "";
  context += `Informations utilisateur:\n`;
  context += `- Nom: ${userData.personalInfo?.firstName || ""} ${userData.personalInfo?.lastName || ""}\n`;
  context += `- Nom d'affichage: ${userData.displayName || "Utilisateur"}\n`;
  if (userData.personalInfo?.birthDate) {
    try {
      const birthDate = userData.personalInfo.birthDate.toDate ? userData.personalInfo.birthDate.toDate() : new Date(userData.personalInfo.birthDate);
      const age = differenceInYears(new Date(), birthDate);
      context += `- Âge: ${age} ans\n`;
    } catch (e) { console.error("Erreur calcul âge:", e); }
  }
  if (userData.personalInfo?.familyRelationship) {
    context += `- Rôle familial: ${userData.personalInfo.familyRelationship}\n`;
  }
  context += `\nPréférences alimentaires:\n`;
  context += `- Régime: ${userData.dietaryPreferences?.diet || 'Aucun régime spécifique'}\n`;
  context += `- Allergies: ${userData.dietaryPreferences?.allergies?.join(", ") || 'Aucune allergie connue'}\n`;
  if (userData.dietaryPreferences?.dislikes?.length > 0) {
    context += `- Aversions: ${userData.dietaryPreferences.dislikes.join(", ")}\n`;
  }
  if (userData.dietaryPreferences?.favorites?.length > 0) {
    context += `- Favoris: ${userData.dietaryPreferences.favorites.join(", ")}\n`;
  }
  if (familyData) {
    context += `\nInformations famille:\n`;
    context += `- Nom de la famille: ${familyData.familyName || "Non spécifié"}\n`;
    if (familyMembers?.length > 0) {
      context += `- Membres (${familyMembers.length}):\n`;
      familyMembers.forEach(member => {
        if (member.uid !== userData.uid) {
          context += `  * ${member.displayName || "Membre"} (${member.familyRole || "Membre"})\n`;
          if (member.dietaryPreferences?.diet) context += `    - Régime: ${member.dietaryPreferences.diet}\n`;
          if (member.dietaryPreferences?.allergies?.length > 0) context += `    - Allergies: ${member.dietaryPreferences.allergies.join(", ")}\n`;
        }
      });
    }
  }
  return context;
};

// Fonction pour générer le message d'accueil personnalisé
const generateWelcomeMessage = (userData, familyData) => {
  if (!userData) return 'Bonjour ! Comment puis-je vous aider ?';
  const userName = userData.displayName || userData.personalInfo?.firstName || "Utilisateur";
  let welcomeMessage = `Bonjour ${userName} ! `;
  if (userData.personalInfo?.familyRelationship) {
    const role = userData.personalInfo.familyRelationship;
    welcomeMessage += (role === "pere" || role === "mere") ? "Comment organiser les repas familiaux ? " : "Comment vous aider avec vos repas ? ";
  } else {
    welcomeMessage += "Comment vous aider avec vos repas ? ";
  }
  if (userData.dietaryPreferences?.diet) welcomeMessage += `Je vois que vous suivez un régime ${userData.dietaryPreferences.diet}. `;
  if (userData.dietaryPreferences?.allergies?.length > 0) welcomeMessage += "Je tiendrai compte de vos allergies. ";
  if (familyData) welcomeMessage += `Vous faites partie de la famille ${familyData.familyName}. `;
  welcomeMessage += "Demandez-moi des recettes ou de l'aide pour planifier !";
  return welcomeMessage;
};

// Fonction pour appeler l'API Gemini
const callGeminiAPI = async (messages, userContext = "") => {
  const formattedContents = [];
  if (userContext) {
    formattedContents.push({ role: "user", parts: [{ text: `Profil: ${userContext}\n\nRéponds en tenant compte de ces infos.` }] });
    formattedContents.push({ role: "model", parts: [{ text: "Profil pris en compte. Comment puis-je aider ?" }] });
  }
  messages.forEach(msg => {
    formattedContents.push({ role: msg.sender === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] });
  });

  console.log("Appel Gemini:", formattedContents);
  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: formattedContents, generationConfig: { maxOutputTokens: 300 } })
    });
    console.log("Réponse brute Gemini:", response);
    if (!response.ok) {
      let errorData = { message: `Erreur HTTP: ${response.status}` };
      try { errorData = await response.json(); } catch { errorData.message += ` - ${await response.text()}`; }
      throw new Error(errorData?.error?.message || errorData.message || `Erreur API: ${response.statusText}`);
    }
    const data = await response.json();
    console.log("Données Gemini:", data);
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const finishReason = data?.candidates?.[0]?.finishReason;
    if (!text) {
      if (finishReason && finishReason !== "STOP") return `Génération interrompue (${finishReason}). Réessayez.`;
      const safetyRatings = data?.promptFeedback?.safetyRatings || data?.candidates?.[0]?.safetyRatings;
      if (safetyRatings?.some(r => r.blocked || r.probability === 'HIGH')) return "Désolé, contenu bloqué pour sécurité.";
      return "Désolé, réponse non extraite (structure inattendue).";
    }
    return text;
  } catch (error) {
    console.error("Erreur appel Gemini:", error);
    return `Erreur communication assistant: ${error.message}`;
  }
};

// --- Composant Chatbot ---
export default function Chatbot({ userData, familyData, familyMembers, isOpen, onClose }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [userContext, setUserContext] = useState("");
  const [welcomeMessageSet, setWelcomeMessageSet] = useState(false);
  const chatListRef = useRef(null);

  // --- State pour la reconnaissance vocale ---
  const [isRecording, setIsRecording] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const recognitionRef = useRef(null);

  // --- Initialisation et Effets ---
  useEffect(() => {
    // Générer le contexte utilisateur quand les données sont disponibles
    if (userData) {
      const context = generateUserContext(userData, familyData, familyMembers);
      setUserContext(context);
      console.log("Contexte utilisateur généré:", context);
      // Définir le message d'accueil une seule fois
      if (!welcomeMessageSet && isOpen) {
        const welcomeMsg = generateWelcomeMessage(userData, familyData);
        setChatMessages([{ sender: 'bot', text: welcomeMsg }]);
        setWelcomeMessageSet(true);
      }
    }
  }, [userData, familyData, familyMembers, welcomeMessageSet, isOpen]);

  useEffect(() => {
    // Scroll vers le bas quand les messages changent
    if (chatListRef.current) {
      setTimeout(() => {
        if (chatListRef.current) {
          chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [chatMessages, isChatLoading]);

  // --- Initialisation Reconnaissance Vocale ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'fr-FR';

        recognition.onresult = (event) => {
          let interim = '', final = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) final += event.results[i][0].transcript;
            else interim += event.results[i][0].transcript;
          }
          setUserInput(final || interim);
          if (final) console.log("Transcription finale:", final);
        };

        recognition.onerror = (event) => {
          console.error('Erreur reconnaissance vocale:', event.error);
          let msg = 'Erreur reconnaissance vocale.';
          if (event.error === 'no-speech') msg = 'Aucune parole détectée.';
          else if (event.error === 'audio-capture') msg = 'Problème capture audio.';
          else if (event.error === 'not-allowed') msg = 'Permission micro refusée.';
          setVoiceError(msg);
          setIsRecording(false);
        };

        recognition.onend = () => {
          console.log('Reconnaissance vocale terminée.');
          setIsRecording(false);
        };
        recognitionRef.current = recognition;
      } else {
        console.warn('Web Speech API non supportée.');
        setIsSpeechSupported(false);
      }
    }
    return () => { recognitionRef.current?.abort(); };
  }, []);

  // --- Gestionnaires d'événements ---
  const handleSendMessage = useCallback(async () => {
    const messageText = userInput.trim();
    if (!messageText || isChatLoading) return;

    const newUserMessage = { sender: 'user', text: messageText };
    const updatedMessages = [...chatMessages, newUserMessage];
    setChatMessages(updatedMessages);
    setUserInput('');
    setIsChatLoading(true);
    setChatError('');
    setVoiceError('');

    try {
      const historyForAPI = updatedMessages.slice(welcomeMessageSet ? 1 : 0);
      const botResponse = await callGeminiAPI(historyForAPI, userContext);
      setChatMessages(prev => [...prev, { sender: 'bot', text: botResponse }]);
    } catch (error) {
      console.error("Erreur envoi message:", error);
      setChatError(`Erreur: ${error.message || 'Impossible de contacter l\'assistant.'}`);
    } finally {
      setIsChatLoading(false);
    }
  }, [userInput, chatMessages, isChatLoading, userContext, welcomeMessageSet]);

  const handleToggleRecording = () => {
    if (!isSpeechSupported) {
      setVoiceError('Reconnaissance vocale non supportée.');
      return;
    }
    if (isRecording) {
      recognitionRef.current?.stop();
      console.log('Arrêt manuel enregistrement.');
    } else {
      setVoiceError('');
      setChatError('');
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
        console.log('Démarrage enregistrement.');
      } catch (error) {
        console.error("Erreur démarrage enregistrement:", error);
        setVoiceError("Impossible de démarrer l'enregistrement.");
        setIsRecording(false);
      }
    }
  };

  const handleClose = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    }
    setChatError('');
    setVoiceError('');
    onClose();
  }

  // --- Styles personnalisés pour Markdown ---
  const markdownStyles = {
    '& h1': { fontSize: '1.5rem', fontWeight: 500, margin: '0.5rem 0' },
    '& h2': { fontSize: '1.25rem', fontWeight: 500, margin: '0.5rem 0' },
    '& h3': { fontSize: '1rem', fontWeight: 500, margin: '0.5rem 0' },
    '& p': { margin: '0.5rem 0', lineHeight: 1.5 },
    '& ul, & ol': { margin: '0.5rem 0', paddingLeft: '1.5rem' },
    '& li': { margin: '0.25rem 0' },
    '& strong': { fontWeight: 700 },
    '& em': { fontStyle: 'italic' },
    '& code': {
      backgroundColor: alpha(theme.palette.grey[200], 0.5),
      padding: '0.2rem 0.4rem',
      borderRadius: '4px',
      fontFamily: 'monospace',
    },
    '& pre': {
      backgroundColor: alpha(theme.palette.grey[200], 0.5),
      padding: '0.5rem',
      borderRadius: '4px',
      overflowX: 'auto',
    },
  };

  // --- Rendu du composant ---
  return (
    <Fade in={isOpen}>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: isMobile ? 0 : 32,
          right: isMobile ? 0 : 32,
          width: isMobile ? '100%' : 400,
          height: isMobile ? 'calc(100% - 56px)' : 600,
          zIndex: 1301,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: isMobile ? 0 : '16px',
          overflow: 'hidden',
          bgcolor: theme.palette.background.paper,
        }}
      >
        {/* En-tête */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 1.5,
            bgcolor: alpha(theme.palette.primary.main, 0.9),
            color: theme.palette.primary.contrastText,
            borderTopLeftRadius: isMobile ? 0 : '16px',
            borderTopRightRadius: isMobile ? 0 : '16px',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <SmartToyIcon />
            <Typography variant="h6" component="div">Assistant Repas</Typography>
          </Stack>
          <IconButton onClick={handleClose} size="small" sx={{ color: 'inherit' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Messages */}
        <List ref={chatListRef} sx={{ flexGrow: 1, overflowY: 'auto', p: 2, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
          {chatMessages.map((msg, index) => (
            <ListItem key={index} sx={{ py: 0.5, display: 'flex', flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row' }}>
              <Avatar sx={{ bgcolor: msg.sender === 'user' ? theme.palette.secondary.main : theme.palette.primary.main, width: 32, height: 32, ml: msg.sender === 'user' ? 1 : 0, mr: msg.sender === 'user' ? 0 : 1 }}>
                {msg.sender === 'user' ? <AccountCircleIcon fontSize="small" /> : <SmartToyIcon fontSize="small" />}
              </Avatar>
              <Paper elevation={1} sx={{ p: 1.5, borderRadius: '12px', bgcolor: msg.sender === 'user' ? alpha(theme.palette.secondary.light, 0.2) : alpha(theme.palette.primary.light, 0.2), maxWidth: '80%' }}>
                {msg.sender === 'bot' ? (
                  <ReactMarkdown
                    rehypePlugins={[rehypeSanitize]}
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <CodeMirror
                            value={String(children).replace(/\n$/, '')}
                            theme={githubLight}
                            extensions={[match[1] ? { language: match[1] } : {}]}
                            readOnly
                            {...props}
                          />
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      }
                    }}
                    sx={markdownStyles}
                  >
                    {msg.text}
                  </ReactMarkdown>
                ) : (
                  <Typography sx={{ wordBreak: 'break-word' }}>{msg.text}</Typography>
                )}
              </Paper>
            </ListItem>
          ))}
          {isChatLoading && (
            <ListItem sx={{ py: 0.5, display: 'flex', justifyContent: 'flex-start' }}>
              <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 32, height: 32, mr: 1 }}><SmartToyIcon fontSize="small" /></Avatar>
              <Skeleton variant="rounded" width={100} height={40} />
            </ListItem>
          )}
        </List>

        {/* Zone de saisie */}
        <Box sx={{ p: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
          {chatError && <Alert severity="error" sx={{ mb: 1 }}>{chatError}</Alert>}
          {voiceError && <Alert severity="warning" sx={{ mb: 1 }}>{voiceError}</Alert>}
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder="Posez votre question..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isChatLoading && handleSendMessage()}
              disabled={isChatLoading}
              sx={{ flexGrow: 1 }}
            />
            {isSpeechSupported && (
              <Tooltip title={isRecording ? "Arrêter l'enregistrement" : "Enregistrer note vocale"}>
                <span>
                  <IconButton
                    color={isRecording ? "error" : "primary"}
                    onClick={handleToggleRecording}
                    disabled={isChatLoading}
                    aria-label={isRecording ? "Arrêter l'enregistrement" : "Enregistrer note vocale"}
                  >
                    {isRecording ? <StopIcon /> : <MicIcon />}
                  </IconButton>
                </span>
              </Tooltip>
            )}
            <Tooltip title="Envoyer">
              <span>
                <IconButton
                  color="primary"
                  onClick={handleSendMessage}
                  disabled={!userInput.trim() || isChatLoading}
                  aria-label="Envoyer le message"
                >
                  {isChatLoading ? <CircularProgress size={24} /> : <SendIcon />}
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Box>
      </Paper>
    </Fade>
  );
}