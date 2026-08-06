import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Alert,
  IconButton,
  Chip,
  Stack,
  Tab,
  Tabs,
  CircularProgress,
  Fab,
  Grid,
  Paper,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Build as AdjustIcon,
} from '@mui/icons-material';

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Navigation tabs: 0 = Products list, 1 = Stock Audit Logs
  const [activeTab, setActiveTab] = useState(0);

  // Modals state
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openAdjustModal, setOpenAdjustModal] = useState(false);
  
  // Add product form
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newUnit, setNewUnit] = useState('kg');
  const [newMinStock, setNewMinStock] = useState('20');
  const [addError, setAddError] = useState('');
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Adjust product stock form
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustMinStock, setAdjustMinStock] = useState('20');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustError, setAdjustError] = useState('');
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/api/inventory');
      setProducts(response.data);
    } catch (err) {
      setError('Failed to fetch soap inventory.');
      console.error(err);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await api.get('/api/inventory/history');
      setHistory(response.data);
    } catch (err) {
      console.error('Failed to load inventory audit logs.', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    await fetchProducts();
    await fetchHistory();
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this soap product? This will fail if the product has been used in transactions or has manual stock adjustments.')) {
      return;
    }
    try {
      await api.delete(`/api/inventory/${id}`);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete product.');
      console.error(err);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    if (newValue === 1) {
      fetchHistory();
    }
  };

  // Add product modal handlers
  const handleOpenAddModal = () => {
    setOpenAddModal(true);
    setAddError('');
    setNewName('');
    setNewQty('');
    setNewUnit('kg');
    setNewMinStock('20');
  };

  const handleCloseAddModal = () => setOpenAddModal(false);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setAddError('');

    if (!newName.trim()) {
      setAddError('Product name is required.');
      return;
    }
    if (!newQty || parseFloat(newQty) < 0) {
      setAddError('Initial stock quantity cannot be negative.');
      return;
    }

    setSubmittingAdd(true);
    try {
      await api.post('/api/inventory', {
        name: newName.trim(),
        quantity: parseFloat(newQty),
        unit: newUnit,
        minStock: parseFloat(newMinStock || '20'),
      });
      handleCloseAddModal();
      loadData();
    } catch (err) {
      setAddError(err.response?.data?.message || 'Failed to add product. Make sure the name is unique.');
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Adjust stock modal handlers
  const handleOpenAdjustModal = (product) => {
    setSelectedProduct(product);
    setOpenAdjustModal(true);
    setAdjustError('');
    setAdjustQty('');
    setAdjustMinStock(product.minStock ? product.minStock.toString() : '20');
    setAdjustNotes('');
  };

  const handleCloseAdjustModal = () => setOpenAdjustModal(false);

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    setAdjustError('');

    const change = adjustQty ? parseFloat(adjustQty) : 0.0;
    const newMin = adjustMinStock ? parseFloat(adjustMinStock) : 20.0;

    if (change === 0 && newMin === selectedProduct.minStock) {
      setAdjustError('Please specify a quantity change or update the minimum threshold.');
      return;
    }

    if (selectedProduct.quantity + change < 0) {
      setAdjustError(`Insufficient stock! Current stock is ${selectedProduct.quantity} ${selectedProduct.unit}. Adjusted level cannot fall below 0.`);
      return;
    }

    setSubmittingAdjust(true);
    try {
      await api.put(`/api/inventory/${selectedProduct.id}/adjust`, {
        quantityChanged: change,
        minStock: newMin,
        notes: adjustNotes.trim() || 'Manual stock level adjustment',
      });
      handleCloseAdjustModal();
      loadData();
    } catch (err) {
      setAdjustError(err.response?.data?.message || 'Failed to adjust stock level.');
    } finally {
      setSubmittingAdjust(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, pb: 8, position: 'relative' }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'extraBold', color: 'primary.dark' }}>
          Inventory Manager
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={loadData} color="primary" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Tabs Menu */}
      <Paper sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Stock Ledger" sx={{ fontWeight: 'bold', py: 2 }} />
          <Tab label="Stock Audit Logs" sx={{ fontWeight: 'bold', py: 2 }} />
        </Tabs>
      </Paper>

      {/* Role Banner */}
      <Alert severity="success" sx={{ mb: 3, borderRadius: 3, border: '1px solid #c8e6c9', bgcolor: '#e8f5e9', color: '#2e7d32' }}>
        Welcome back, Shop Manager (Admin)!
      </Alert>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : activeTab === 0 ? (
        /* Tab 0: Product Stocks List in Card layouts matching screenshot */
        products.length > 0 ? (
          <Grid container spacing={2.5}>
            {products.map((product) => {
              const minVal = product.minStock !== null ? product.minStock : 20.0;
              const initialVal = product.initialStock !== null ? product.initialStock : product.quantity;
              const isLow = product.quantity < minVal;
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                  <Card
                    sx={{
                      borderRadius: 3.5,
                      boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                      border: '1px solid rgba(0,0,0,0.05)',
                      borderLeft: isLow ? '4px solid #f59e0b' : '4px solid #10b981',
                      p: 2.5,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: isLow ? '0 10px 25px rgba(245, 158, 11, 0.08)' : '0 10px 25px rgba(16, 185, 129, 0.08)',
                      }
                    }}
                  >
                    {/* Top Row: Name and warning status */}
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.dark', fontSize: '1rem', lineHeight: 1.2 }}>
                          {product.name}
                        </Typography>
                        {isLow && (
                          <WarningIcon color="warning" fontSize="small" />
                        )}
                      </Box>
                      
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                        Min Alert: <strong>{minVal.toFixed(1)} {product.unit}</strong><br />
                        Initial Seed: <strong>{initialVal.toFixed(1)} {product.unit}</strong>
                      </Typography>
                    </Box>

                    {/* Bottom Row: Stock Quantity and Action buttons */}
                    <Box sx={{ mt: 'auto' }}>
                      <Divider sx={{ my: 1.5, borderColor: 'rgba(0,0,0,0.06)' }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                          Available:
                        </Typography>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 'extraBold',
                            color: isLow ? 'error.main' : 'success.main',
                            fontSize: '1.15rem'
                          }}
                        >
                          {product.quantity.toFixed(1)} {product.unit}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<AdjustIcon sx={{ fontSize: '0.9rem' }} />}
                          onClick={() => handleOpenAdjustModal(product)}
                          sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 'bold',
                            color: 'primary.main',
                            borderColor: 'primary.main',
                            px: 1.5,
                            py: 0.5,
                          }}
                        >
                          Adjust Stock
                        </Button>
                        <IconButton onClick={() => handleDeleteProduct(product.id)} color="error" size="small" sx={{ bgcolor: 'rgba(211,47,47,0.04)', '&:hover': { bgcolor: 'rgba(211,47,47,0.1)' } }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Card sx={{ p: 6, textAlign: 'center', border: '1px dashed #ccc', borderRadius: 3 }}>
            <Typography color="text.secondary">No soap products registered.</Typography>
          </Card>
        )
      ) : (
        /* Tab 1: Audit Log History List in Card layouts */
        history.length > 0 ? (
          <Grid container spacing={2.5}>
            {history.map((log) => {
              const isUse = log.transactionType === 'USE_STOCK';
              const isAdd = log.transactionType === 'ADD_STOCK';
              return (
                <Grid item xs={12} sm={6} md={4} key={log.id}>
                  <Card
                    sx={{
                      borderRadius: 3.5,
                      boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                      border: '1px solid rgba(0,0,0,0.05)',
                      borderLeft: isAdd ? '4px solid #0ea5e9' : isUse ? '4px solid #64748b' : '4px solid #a855f7',
                      p: 2.5,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                      }
                    }}
                  >
                    {/* Top Row: Action Chip & Time */}
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Chip
                          label={log.transactionType}
                          size="small"
                          color={isAdd ? 'primary' : isUse ? 'default' : 'secondary'}
                          variant="outlined"
                          sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>

                      {/* Product Name */}
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.dark', fontSize: '0.95rem', mb: 0.5 }}>
                        {log.soapProduct?.name}
                      </Typography>
                      
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        Prior: {log.previousQuantity.toFixed(1)} → New: {log.newQuantity.toFixed(1)} {log.soapProduct?.unit}
                      </Typography>
                    </Box>

                    {/* Bottom row: quantity change and operator details */}
                    <Box sx={{ mt: 'auto' }}>
                      <Divider sx={{ my: 1.5, borderColor: 'rgba(0,0,0,0.06)' }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
                          By: {log.performedBy?.fullName || 'System'}
                        </Typography>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 'bold',
                            color: log.quantityChanged < 0 ? 'error.main' : 'success.main',
                            fontSize: '0.9rem'
                          }}
                        >
                          {log.quantityChanged > 0 ? `+${log.quantityChanged.toFixed(1)}` : log.quantityChanged.toFixed(1)} {log.soapProduct?.unit}
                        </Typography>
                      </Box>
                      {log.notes && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', mt: 0.5, bgcolor: 'rgba(0,0,0,0.02)', p: 0.8, borderRadius: 1 }}>
                          {log.notes}
                        </Typography>
                      )}
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Card sx={{ p: 6, textAlign: 'center', border: '1px dashed #ccc', borderRadius: 3 }}>
            <Typography color="text.secondary">No stock history logs available.</Typography>
          </Card>
        )
      )}

      {/* FAB to Add Soap Product */}
      <Fab
        color="primary"
        variant="extended"
        onClick={handleOpenAddModal}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          fontWeight: 'bold',
          textTransform: 'none',
          px: 3,
          boxShadow: '0 4px 14px rgba(11, 83, 148, 0.4)',
        }}
      >
        <AddIcon sx={{ mr: 1 }} />
        Add Resource
      </Fab>

      {/* Add Product Modal Dialog */}
      <Dialog open={openAddModal} onClose={handleCloseAddModal} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Register Soap Product</DialogTitle>
        <Box component="form" onSubmit={handleAddProduct}>
          <DialogContent dividers>
            {addError && <Alert severity="error" sx={{ mb: 2 }}>{addError}</Alert>}
            <Stack spacing={3}>
              <TextField
                required
                fullWidth
                label="Product Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Liquid Softener Lemon"
              />
              <TextField
                required
                fullWidth
                type="number"
                label="Initial Quantity"
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                placeholder="0.00"
                inputProps={{ min: "0", step: "0.01" }}
              />
              <TextField
                required
                fullWidth
                select
                label="Unit of Measurement"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
              >
                <MenuItem value="kg">Kilograms (kg)</MenuItem>
                <MenuItem value="liters">Liters (L)</MenuItem>
                <MenuItem value="pcs">Pieces (pcs)</MenuItem>
              </TextField>
              <TextField
                required
                fullWidth
                type="number"
                label="Minimum Stock Threshold (Min)"
                value={newMinStock}
                onChange={(e) => setNewMinStock(e.target.value)}
                placeholder="20"
                inputProps={{ min: "0" }}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={handleCloseAddModal} color="inherit">Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submittingAdd}
              startIcon={submittingAdd && <CircularProgress size={16} color="inherit" />}
            >
              Add Product
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Adjust Stock Modal Dialog */}
      <Dialog open={openAdjustModal} onClose={handleCloseAdjustModal} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          Adjust Stock: {selectedProduct?.name}
        </DialogTitle>
        <Box component="form" onSubmit={handleAdjustStock}>
          <DialogContent dividers>
            {adjustError && <Alert severity="error" sx={{ mb: 2 }}>{adjustError}</Alert>}
            <Stack spacing={3}>
              <Typography variant="body2" color="text.secondary">
                Current Level: <strong>{selectedProduct?.quantity} {selectedProduct?.unit}</strong>
              </Typography>
              <TextField
                required
                fullWidth
                type="number"
                label="Quantity Adjustment"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                placeholder="Use positive for additions, negative for deductions"
                helperText="Example: '+10' to restock 10 units, '-5' to consume 5 units"
                inputProps={{ step: "0.01" }}
              />
              <TextField
                required
                fullWidth
                type="number"
                label="Minimum Stock Threshold (Min)"
                value={adjustMinStock}
                onChange={(e) => setAdjustMinStock(e.target.value)}
                placeholder="20"
                inputProps={{ min: "0" }}
              />
              <TextField
                fullWidth
                label="Notes / Reason"
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                placeholder="e.g., Delivery restock, Spillage adjustment..."
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={handleCloseAdjustModal} color="inherit">Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submittingAdjust}
              startIcon={submittingAdjust && <CircularProgress size={16} color="inherit" />}
            >
              Apply Change
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default Inventory;
