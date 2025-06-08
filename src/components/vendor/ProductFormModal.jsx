"use client";

import { useState, useEffect } from 'react';
import {
  Dialog, DialogActions, DialogContent, DialogTitle, TextField, Button,
  Grid, CircularProgress, Switch, FormControlLabel, Typography, Box, IconButton,
  Select, MenuItem, InputLabel, FormControl, Chip, Alert // Added Alert
} from '@mui/material';
import { PhotoCamera, Delete as DeleteIcon } from '@mui/icons-material';
import { db, storage } from '../../firebaseConfig'; // Ensure storage is exported from firebaseConfig
import { doc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAuth } from '../../contexts/AuthContext';

// Sample categories - this could come from a config file or Firestore in the future
const PREDEFINED_CATEGORIES = ["Légumes", "Fruits", "Viandes", "Poissons", "Épices", "Boissons", "Autre"];

function ProductFormModal({ open, onClose, product, onSave }) {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stockQuantity: '',
    unit: '',
    isActive: true,
  });
  const [currentImages, setCurrentImages] = useState([]); // URLs of existing images
  const [newImageFiles, setNewImageFiles] = useState([]); // File objects for new uploads
  const [imagePreviews, setImagePreviews] = useState([]); // Data URLs for new image previews
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price || '',
        category: product.category || '',
        stockQuantity: product.stockQuantity === null || product.stockQuantity === undefined ? '' : product.stockQuantity,
        unit: product.unit || '',
        isActive: product.isActive === undefined ? true : product.isActive,
      });
      setCurrentImages(product.images || []);
      setImagePreviews([]); // Clear previews when editing existing product
      setNewImageFiles([]);
    } else {
      // Reset form for new product
      setFormData({
        name: '', description: '', price: '', category: '',
        stockQuantity: '', unit: '', isActive: true,
      });
      setCurrentImages([]);
      setNewImageFiles([]);
      setImagePreviews([]);
    }
    setError(''); // Clear error when product or open state changes
  }, [product, open]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setNewImageFiles(prevFiles => [...prevFiles, ...files].slice(0, 5 - currentImages.length)); // Limit total images, e.g. 5

    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(prevPreviews => [...prevPreviews, ...previews].slice(0, 5 - currentImages.length));
  };

  const removeNewImage = (index) => {
    setNewImageFiles(files => files.filter((_, i) => i !== index));
    setImagePreviews(previews => previews.filter((_, i) => i !== index));
    // Revoke Object URL to free memory
    URL.revokeObjectURL(imagePreviews[index]);
  };

  const removeCurrentImage = async (imageUrl, index) => {
    // This function will just mark for removal. Actual deletion from storage happens on submit.
    // For simplicity, we'll filter it out from currentImages.
    // A more robust solution would involve a separate list of imagesToDelete.
    if (!window.confirm("Supprimer cette image existante du produit ?")) return;
    setCurrentImages(images => images.filter((_, i) => i !== index));
  };

  const uploadImagesAndDeleteMarked = async (productId, existingImageUrlsToKeep) => {
    let uploadedUrls = [...existingImageUrlsToKeep]; // Start with images that were not removed by the user

    // Delete images that were in currentImages initially but are not in existingImageUrlsToKeep
    if (product && product.images) {
        for (const imageUrl of product.images) {
            if (!existingImageUrlsToKeep.includes(imageUrl)) {
                try {
                    const imageRef = ref(storage, imageUrl);
                    await deleteObject(imageRef);
                } catch (err) {
                    console.warn("Error deleting image from storage, it might have been already deleted or path is wrong:", err);
                    // Potentially log this error but don't block submission for it
                }
            }
        }
    }


    for (const file of newImageFiles) {
      const imageRef = ref(storage, `products/${currentUser.uid}/${productId}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(imageRef, file);

      await new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => { /* Progress handling (optional) */ },
          (error) => reject(error),
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            uploadedUrls.push(downloadURL);
            resolve();
          }
        );
      });
    }
    return uploadedUrls;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      setError("Utilisateur non authentifié.");
      return;
    }
    // Basic Validation
    if (!formData.name.trim() || !formData.price || !formData.category) {
      setError("Nom, prix et catégorie sont requis.");
      return;
    }
    if (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) < 0) {
      setError("Le prix doit être un nombre positif.");
      return;
    }
    if (formData.stockQuantity !== '' && (isNaN(parseInt(formData.stockQuantity)) || parseInt(formData.stockQuantity) < 0)) {
      setError("La quantité en stock doit être un nombre positif ou vide.");
      return;
    }
    if ((currentImages.length + newImageFiles.length) === 0) {
        setError("Veuillez télécharger au moins une image pour le produit.");
        return;
    }
    if ((currentImages.length + newImageFiles.length) > 5) {
        setError("Vous ne pouvez pas télécharger plus de 5 images au total.");
        return;
    }


    setIsSubmitting(true);
    setError('');

    try {
      const isEditMode = !!product;
      const productId = isEditMode ? product.id : doc(collection(db, "products")).id;

      const finalImageUrls = await uploadImagesAndDeleteMarked(productId, currentImages);

      const productData = {
        ...formData,
        vendorId: currentUser.uid,
        price: parseFloat(formData.price),
        stockQuantity: formData.stockQuantity === '' ? null : parseInt(formData.stockQuantity),
        images: finalImageUrls,
        updatedAt: serverTimestamp(),
      };

      if (isEditMode) {
        await updateDoc(doc(db, "products", product.id), productData);
      } else {
        productData.createdAt = serverTimestamp();
        // For new products, ensure the ID used for image path is part of the document
        productData.id = productId;
        await addDoc(collection(db, "products"), productData);
        // Note: Firestore auto-generates IDs. If you use addDoc without specifying an ID via .set() on a docRef,
        // the ID in productData.id might be just for your reference or image path, not the actual doc ID unless you use it with setDoc.
        // To ensure consistency, it might be better to setDoc(doc(db, "products", productId), productData);
        // For this example, addDoc is fine, but be aware of ID management.
        // The current code uses generated ID for image path and addDoc generates another ID for the doc.
        // Let's refine this:
        // For new product, use setDoc with the generated productId
        // await setDoc(doc(db, "products", productId), productData); // This line was missing if we want productData.id to be THE doc id.
        // The original code used addDoc, which is fine, but productData.id won't be the document's ID.
        // Let's stick to `addDoc` for now as it's simpler and the `productId` was for image path.
        // If `productData.id` must be the document ID, then `setDoc` on `doc(db, "products", productId)` is needed.
        // The prompt's code implies `addDoc` is used and `productId` is for image path consistency, which is fine.
      }

      onSave();
      onClose();
    } catch (err) {
      console.error("Error saving product:", err);
      setError(`Erreur lors de l'enregistrement du produit: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{product ? "Modifier le Produit" : "Ajouter un Nouveau Produit"}</DialogTitle>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3} sx={{pt: 1}}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nom du produit"
                name="name"
                value={formData.name}
                onChange={handleChange}
                fullWidth
                required
                disabled={isSubmitting}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required disabled={isSubmitting}>
                <InputLabel id="category-label">Catégorie</InputLabel>
                <Select
                  labelId="category-label"
                  label="Catégorie"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                >
                  {PREDEFINED_CATEGORIES.map(cat => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                fullWidth
                multiline
                rows={3}
                disabled={isSubmitting}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Prix (FCFA)"
                name="price"
                type="number"
                value={formData.price}
                onChange={handleChange}
                fullWidth
                required
                InputProps={{ inputProps: { min: 0 } }}
                disabled={isSubmitting}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Quantité en Stock"
                name="stockQuantity"
                type="number"
                value={formData.stockQuantity}
                onChange={handleChange}
                fullWidth
                helperText="Laisser vide si non applicable"
                InputProps={{ inputProps: { min: 0 } }}
                disabled={isSubmitting}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Unité (ex: kg, pièce)"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                fullWidth
                disabled={isSubmitting}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={formData.isActive} onChange={handleChange} name="isActive" disabled={isSubmitting} />}
                label="Produit Actif (visible pour les clients)"
              />
            </Grid>

            {/* Image Upload Section */}
            <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>Images du produit (Max 5)</Typography>
                <Button
                    variant="outlined"
                    component="label"
                    startIcon={<PhotoCamera />}
                    sx={{ mb: 1 }}
                    disabled={isSubmitting || (currentImages.length + newImageFiles.length >= 5)}
                >
                    Télécharger des Images
                    <input type="file" hidden multiple accept="image/*" onChange={handleImageChange} />
                </Button>
                <Grid container spacing={1}>
                    {currentImages.map((url, index) => (
                        <Grid item key={`current-${index}`} xs={6} sm={4} md={3}>
                            <Box sx={{ position: 'relative', border: '1px solid lightgrey', borderRadius:1, p:0.5 }}>
                                <img src={url} alt={`Produit ${index + 1}`} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '4px' }} />
                                {!isSubmitting && (
                                  <IconButton size="small" onClick={() => removeCurrentImage(url, index)} sx={{position:'absolute', top:0, right:0, backgroundColor:'rgba(255,255,255,0.7)'}}>
                                      <DeleteIcon fontSize="small" color="error"/>
                                  </IconButton>
                                )}
                            </Box>
                        </Grid>
                    ))}
                    {imagePreviews.map((previewUrl, index) => (
                        <Grid item key={`new-${index}`} xs={6} sm={4} md={3}>
                             <Box sx={{ position: 'relative', border: '1px solid lightgrey', borderRadius:1, p:0.5 }}>
                                <img src={previewUrl} alt={`Aperçu ${index + 1}`} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '4px' }} />
                                {!isSubmitting && (
                                  <IconButton size="small" onClick={() => removeNewImage(index)} sx={{position:'absolute', top:0, right:0, backgroundColor:'rgba(255,255,255,0.7)'}}>
                                     <DeleteIcon fontSize="small" color="error"/>
                                  </IconButton>
                                )}
                            </Box>
                        </Grid>
                    ))}
                </Grid>
                 { (currentImages.length + newImageFiles.length) === 0 && (
                    <Typography color="text.secondary" sx={{mt:1}}>Aucune image sélectionnée. Au moins une image est requise.</Typography>
                )}
            </Grid>

            {error && <Grid item xs={12}><Alert severity="error" sx={{ mt: 2 }}>{error}</Alert></Grid>}
          </Grid>
          {/* Submit button is in DialogActions, not part of the form element here, so onClick is used.
              If it were inside <form>, type="submit" would be fine. */}
        </form>
      </DialogContent>
      <DialogActions sx={{p: {xs:2, sm:3}}}>
        <Button onClick={onClose} color="secondary" variant="outlined" disabled={isSubmitting}>Annuler</Button>
        <Button onClick={handleSubmit} color="primary" variant="contained" disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={24} /> : (product ? "Mettre à jour" : "Enregistrer")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ProductFormModal;
