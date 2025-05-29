import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Paper, CircularProgress } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const Chatbot = ({ open, onClose }) => {
  const { currentUser, userData } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Message de bienvenue quand le chat s'ouvre
  useEffect(() => {
    if (open) {
      setMessages([{ text: `Bonjour ${currentUser?.displayName || 'Utilisateur'} ! Comment puis-je vous aider aujourd'hui ?`, sender: 'bot' }]);
    }
  }, [open, currentUser]);

  // Envoi du message à l'API Gemini
  const handleSend = async () => {
    if (!input.trim()) return;

    // Ajoute le message de l'utilisateur à l'historique
    setMessages((prev) => [...prev, { text: input, sender: 'user' }]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyDfu0Q9IKDvQu5ewtsG7xnh43iebNDDuyU}`,
        {
          contents: [
            {
              parts: [
                {
                  text: `Vous êtes un assistant culinaire pour ${currentUser.displayName}. Voici les données de l'utilisateur : ${JSON.stringify(userData)}. Utilisez ces informations pour personnaliser vos réponses. Question de l'utilisateur : ${input}`,
                },
              ],
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const botMessage = response.data.candidates[0].content.parts[0].text;
      setMessages((prev) => [...prev, { text: botMessage, sender: 'bot' }]);
    } catch (error) {
      console.error('Erreur avec l\'API Gemini:', error);
      setMessages((prev) => [...prev, { text: 'Désolé, une erreur est survenue. Réessayez plus tard.', sender: 'bot' }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 80,
        right: 16,
        width: 400,
        height: 500,
        display: 'flex',
        flexDirection: 'column',
        padding: 2,
      }}
    >
      <Typography variant="h6" sx={{ marginBottom: 2 }}>Assistant Culinaire</Typography>
      <Box sx={{ flexGrow: 1, overflowY: 'auto', marginBottom: 2 }}>
        {messages.map((msg, index) => (
          <Typography key={index} align={msg.sender === 'user' ? 'right' : 'left'} sx={{ marginBottom: 1 }}>
            {msg.text}
          </Typography>
        ))}
        {loading && <CircularProgress size={20} />}
      </Box>
      <Box sx={{ display: 'flex' }}>
        <TextField
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tapez votre message..."
          fullWidth
          sx={{ marginRight: 1 }}
        />
        <Button variant="contained" onClick={handleSend} disabled={loading}>
          Envoyer
        </Button>
      </Box>
    </Paper>
  );
};

export default Chatbot;