import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  LocalFlorist as CleanIcon,
  Delete as DeleteIcon,
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
    <Box sx={{ flexGrow: 1 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
          Soap Stock Inventory
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={loadData} color="primary" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAddModal}
            sx={{ fontWeight: 'bold' }}
          >
            Add Soap Product
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Tabs Menu */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Soap Stock Levels" sx={{ fontWeight: 'bold', py: 2 }} />
          <Tab label="Stock Audit Trail Logs" sx={{ fontWeight: 'bold', py: 2 }} />
        </Tabs>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : activeTab === 0 ? (
        /* Tab 0: Product Stocks List */
        <Card>
          <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto', borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#d0e0e3', color: '#073763', textAlign: 'center' }}>No.</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#d0e0e3', color: '#073763' }}>List of Items</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#d0e0e3', color: '#073763', textAlign: 'center' }}>Unit</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#d0e0e3', color: '#073763', textAlign: 'center' }}>Min</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#d0e0e3', color: '#073763', textAlign: 'center' }}>Initial</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#d0e0e3', color: '#073763', textAlign: 'center' }}>Available</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#d0e0e3', color: '#073763', textAlign: 'center' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#d0e0e3', color: '#073763', textAlign: 'center' }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.length > 0 ? (
                  products.map((product, idx) => {
                    const minVal = product.minStock !== null ? product.minStock : 20.0;
                    const initialVal = product.initialStock !== null ? product.initialStock : product.quantity;
                    const isLow = product.quantity < minVal;
                    return (
                      <TableRow key={product.id} hover>
                        <TableCell sx={{ textAlign: 'center' }}>{idx + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>{product.name}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>{product.unit}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>{minVal % 1 === 0 ? minVal : minVal.toFixed(2)}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>{initialVal % 1 === 0 ? initialVal : initialVal.toFixed(2)}</TableCell>
                        <TableCell sx={{ textAlign: 'center', fontWeight: 'bold', color: isLow ? 'error.main' : 'text.primary' }}>
                          {product.quantity % 1 === 0 ? product.quantity : product.quantity.toFixed(2)}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Chip
                            label={isLow ? 'Restock' : 'In Stock'}
                            color={isLow ? 'error' : 'success'}
                            variant={isLow ? 'filled' : 'filled'}
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<EditIcon />}
                              onClick={() => handleOpenAdjustModal(product)}
                              sx={{ borderRadius: 2 }}
                            >
                              Adjust
                            </Button>
                            <IconButton onClick={() => handleDeleteProduct(product.id)} color="error" size="small">
                              <DeleteIcon />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      No soap products registered.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      ) : (
        /* Tab 1: Audit Log History */
        <Card>
          <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto', borderRadius: 0 }}>
            <Table>
              <TableHead sx={{ bgcolor: 'background.default' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Log ID</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Date & Time</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Product Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Action Type</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Qty Changed</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Prior Stock</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>New Stock Level</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Performed By</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Notes/Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.length > 0 ? (
                  history.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>#{log.id}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{log.soapProduct?.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={log.transactionType}
                          size="small"
                          color={
                            log.transactionType === 'ADD_STOCK' ? 'primary' :
                            log.transactionType === 'USE_STOCK' ? 'default' : 'secondary'
                          }
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: log.quantityChanged < 0 ? 'error.main' : 'success.main' }}>
                        {log.quantityChanged > 0 ? `+${log.quantityChanged}` : log.quantityChanged} {log.soapProduct?.unit}
                      </TableCell>
                      <TableCell>{log.previousQuantity.toFixed(2)} {log.soapProduct?.unit}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{log.newQuantity.toFixed(2)} {log.soapProduct?.unit}</TableCell>
                      <TableCell sx={{ fontWeight: 500, color: 'primary.dark' }}>
                        {log.performedBy?.fullName}
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>{log.notes || '—'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                      No stock history logs available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

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
                placeholder="e.g., Delivery refock, Spillage adjustment..."
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
