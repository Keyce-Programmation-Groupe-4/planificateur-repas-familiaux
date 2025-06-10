// src/pages/RecipeFormPage.jsx (Illustrative Example)
import React, { useState } from 'react';
import { Button, TextField, Container, Typography } from '@mui/material';
import { triggerSendNotification } from '../utils/notificationUtils'; // Adjust path as needed
import { getCurrentUserFCMToken } from '../utils/authUtils'; // Adjust path as needed
// import { db } from '../firebaseConfig'; // If interacting with Firestore
// import { collection, addDoc } from 'firebase/firestore';

const RecipeFormPage = () => {
  const [recipeName, setRecipeName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    const fcmToken = await getCurrentUserFCMToken();

    try {
      // Simulate API call or Firestore write
      console.log("Submitting recipe:", { recipeName, instructions });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate async operation

      // Example: await addDoc(collection(db, "recipes"), { recipeName, instructions, createdAt: new Date() });

      console.log("Recipe submitted successfully!");
      if (fcmToken) {
        triggerSendNotification(
          fcmToken,
          "Recipe Submitted!",
          `Your recipe "${recipeName}" has been successfully submitted.`
        );
      } else {
        // Fallback to a standard alert or UI message if token not available
        alert("Recipe submitted successfully! (Push notification not sent - no token)");
      }
      setRecipeName('');
      setInstructions('');

    } catch (error) {
      console.error("Error submitting recipe:", error);
      if (fcmToken) {
        triggerSendNotification(
          fcmToken,
          "Submission Failed",
          `There was an error submitting "${recipeName}". Please try again.`
        );
      } else {
        // Fallback to a standard alert or UI message
        alert("Error submitting recipe. (Push notification not sent - no token)");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Typography variant="h4" component="h1" gutterBottom>
        Submit New Recipe
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Recipe Name"
          variant="outlined"
          fullWidth
          margin="normal"
          value={recipeName}
          onChange={(e) => setRecipeName(e.target.value)}
          required
        />
        <TextField
          label="Instructions"
          variant="outlined"
          fullWidth
          margin="normal"
          multiline
          rows={4}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          required
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={isSubmitting}
          fullWidth
        >
          {isSubmitting ? 'Submitting...' : 'Submit Recipe'}
        </Button>
      </form>
    </Container>
  );
};

export default RecipeFormPage;
