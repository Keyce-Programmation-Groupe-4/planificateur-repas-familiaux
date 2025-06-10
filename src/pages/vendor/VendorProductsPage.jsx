"use client"

import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom'; // For Add Product button if it navigates
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TablePagination,
  Stack,
  Tooltip
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebaseConfig';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { triggerSendNotification } from '../../utils/notificationUtils';
import { getCurrentUserFCMToken } from '../../utils/authUtils';

import ProductFormModal from '../../components/vendor/ProductFormModal';

function VendorProductsPage() {
  const { currentUser, userData } = useAuth();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // States for ProductFormModal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const fetchProducts = async () => {
    if (!currentUser || !userData?.isVendor) {
      setError("Accès non autorisé ou profil vendeur non chargé.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const q = query(collection(db, "products"), where("vendorId", "==", currentUser.uid));
      const querySnapshot = await getDocs(q);
      const fetchedProducts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(fetchedProducts.sort((a,b) => (a.createdAt?.toDate() > b.createdAt?.toDate() ? -1 : 1)));
    } catch (err) {
      console.error("Error fetching products:", err);
      setError("Impossible de charger les produits. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [currentUser, userData]);

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.")) {
      return;
    }
    try {
      const productToDelete = products.find(p => p.id === productId);
      const productName = productToDelete ? productToDelete.name : "Inconnu";
      await deleteDoc(doc(db, "products", productId));
      setProducts(products.filter(p => p.id !== productId));
      alert("Produit supprimé avec succès !"); // Placeholder
      const fcmToken = await getCurrentUserFCMToken();
      if (fcmToken) {
        triggerSendNotification(
          fcmToken,
          "Produit Supprimé",
          `Votre produit "${productName}" a été supprimé avec succès.`
        );
      }
    } catch (err) {
      console.error("Error deleting product:", err);
      const productToDelete = products.find(p => p.id === productId);
      const productName = productToDelete ? productToDelete.name : "Inconnu";
      setError("Erreur lors de la suppression du produit.");
      const fcmToken = await getCurrentUserFCMToken();
      if (fcmToken) {
        triggerSendNotification(
          fcmToken,
          "Échec de la Suppression",
          `Erreur lors de la suppression du produit "${productName}": ${err.message}`
        );
      }
    }
  };

  // Placeholder handlers for modal (to be implemented later)
  // const handleOpenModal = (product = null) => {
  //   setEditingProduct(product);
  //   setIsModalOpen(true);
  // };
  // const handleCloseModal = () => {
  //   setIsModalOpen(false);
  const handleOpenModal = (product = null) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    fetchProducts(); // Refetch products after add/edit
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const displayedProducts = products.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Mes Produits
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddCircleOutlineIcon />}
          onClick={() => handleOpenModal()}
        >
          Ajouter un Produit
        </Button>
      </Stack>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      )}
      {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}

      {!isLoading && !error && products.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            Vous n'avez pas encore de produits.
          </Typography>
          <Typography color="text.secondary" paragraph>
            Commencez par ajouter votre premier produit pour qu'il soit visible par les clients.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddCircleOutlineIcon />}
            onClick={() => handleOpenModal()}
            sx={{mt: 2}}
          >
            Ajouter mon premier produit
          </Button>
        </Paper>
      )}

      {!isLoading && !error && products.length > 0 && (
        <Paper elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{fontWeight: 'bold'}}>Nom du Produit</TableCell>
                  <TableCell sx={{fontWeight: 'bold'}}>Catégorie</TableCell>
                  <TableCell sx={{fontWeight: 'bold', textAlign: 'right'}}>Prix (FCFA)</TableCell>
                  <TableCell sx={{fontWeight: 'bold', textAlign: 'center'}}>Stock</TableCell>
                  <TableCell sx={{fontWeight: 'bold', textAlign: 'center'}}>Actif</TableCell>
                  <TableCell sx={{fontWeight: 'bold', textAlign: 'center'}}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayedProducts.map((product) => (
                  <TableRow key={product.id} hover>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell sx={{textAlign: 'right'}}>{product.price?.toLocaleString('fr-FR')}</TableCell>
                    <TableCell sx={{textAlign: 'center'}}>{product.stockQuantity ?? 'N/A'}</TableCell>
                    <TableCell sx={{textAlign: 'center'}}>{product.isActive ? "Oui" : "Non"}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Tooltip title="Modifier">
                        <IconButton
                          onClick={() => handleOpenModal(product)}
                          color="primary"
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Supprimer">
                        <IconButton onClick={() => handleDeleteProduct(product.id)} color="error" size="small">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={products.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Produits par page:"
          />
        </Paper>
      )}


      {isModalOpen && (
        <ProductFormModal
          open={isModalOpen}
          onClose={handleCloseModal}
          product={editingProduct}
          onSave={fetchProducts} // Pass fetchProducts to onSave prop
        />
      )}
    </Box>
  );
}

export default VendorProductsPage;
