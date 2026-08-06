import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  TextField,
  InputAdornment,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Paper,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  IconButton,
} from '@mui/material';
import {
  LocalLaundryService as LaundryIcon,
  AddCircleOutlined as AddIcon,
  CheckCircleOutlined as SuccessIcon,
  Print as PrintIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  FitnessCenter as WeightIcon,
} from '@mui/icons-material';

const calculateDurationInShop = (createdAtStr, pickedUpAtStr) => {
  if (!createdAtStr) return 'At shop';
  const createdTime = new Date(createdAtStr).getTime();
  if (isNaN(createdTime) || createdTime <= 0) return 'At shop';
  
  const endTime = pickedUpAtStr ? new Date(pickedUpAtStr).getTime() : Date.now();
  const diffMs = endTime - createdTime;
  if (diffMs < 0) return 'Just added';
  
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays > 0) {
    return `${diffDays}d ${diffHours % 24}h`;
  } else if (diffHours > 0) {
    return `${diffHours}h ${diffMins % 60}m`;
  } else {
    return `${diffMins}m`;
  }
};

const EmployeeDashboard = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Quick Entry Transaction Form State (Employee View)
  const [products, setProducts] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [soapUsedQty, setSoapUsedQty] = useState('');
  const [machineNumber, setMachineNumber] = useState('Machine 1');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [referenceNumber, setReferenceNumber] = useState(''); // Last 4 digits reference
  const [selectedServices, setSelectedServices] = useState({}); // serviceId -> quantity
  const [customRates, setCustomRates] = useState({}); // serviceId -> customRate overrides
  const [serviceSearchTerm, setServiceSearchTerm] = useState(''); // Service list search term
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');
  const [submittingForm, setSubmittingForm] = useState(false);

  // Receipt Modal State
  const [openReceiptModal, setOpenReceiptModal] = useState(false);
  const [receiptTx, setReceiptTx] = useState(null);
  const [openServicesDialog, setOpenServicesDialog] = useState(false);
  
  // Employee's Recent Transactions (Employee View)
  const [recentTransactions, setRecentTransactions] = useState([]);

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/dashboard/stats');
      setStats(response.data);
    } catch (err) {
      setError('Failed to fetch dashboard statistics.');
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/api/inventory');
      setProducts(response.data);
    } catch (err) {
      console.error('Failed to load products for dropdown.', err);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await api.get('/api/services');
      setServicesList(response.data);
    } catch (err) {
      setFormError('Failed to fetch laundry services list: ' + (err.response?.data?.message || err.message));
      console.error('Failed to load services.', err);
    }
  };

  const fetchRecentTransactions = async () => {
    try {
      const response = await api.get('/api/transactions');
      setRecentTransactions(response.data.slice(0, 5));
    } catch (err) {
      console.error('Failed to load transactions.', err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await fetchStats();
    await fetchProducts();
    await fetchServices();
    await fetchRecentTransactions();
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const calculateTotalPrice = () => {
    return Object.entries(selectedServices).reduce((sum, [id, qty]) => {
      const serviceId = Number(id);
      const service = servicesList.find(s => s.id === serviceId);
      const rate = customRates[serviceId] !== undefined ? customRates[serviceId] : (service ? service.rate : 0);
      return sum + (rate * qty);
    }, 0);
  };

  // Handle Quick Entry Submission (Employee View)
  const handleQuickSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!selectedProductId) {
      setFormError('Please select a soap product.');
      return;
    }
    if (!weightKg || parseFloat(weightKg) <= 0) {
      setFormError('Weight must be greater than 0 kg.');
      return;
    }
    if (!soapUsedQty || parseFloat(soapUsedQty) < 0) {
      setFormError('Soap amount used cannot be negative.');
      return;
    }
    if (!machineNumber) {
      setFormError('Please select a washing machine.');
      return;
    }

    if (paymentMethod === 'Gcash') {
      const trimmedRef = referenceNumber.trim();
      if (!trimmedRef || trimmedRef.length !== 4 || isNaN(Number(trimmedRef))) {
        setFormError('Please enter exactly the last 4 digits of the GCash reference number.');
        return;
      }
    }

    const payloadServices = Object.entries(selectedServices)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => {
        const serviceId = Number(id);
        return {
          serviceId: serviceId,
          quantity: Number(qty),
          priceAtTransaction: customRates[serviceId] !== undefined ? Number(customRates[serviceId]) : null
        };
      });

    if (payloadServices.length === 0) {
      setFormError('Please select at least one laundry service.');
      return;
    }

    const selectedProduct = products.find(p => p.id === selectedProductId);
    if (selectedProduct && selectedProduct.quantity < parseFloat(soapUsedQty)) {
      setFormError(`Insufficient stock! ${selectedProduct.name} has only ${selectedProduct.quantity} ${selectedProduct.unit} available.`);
      return;
    }

    setSubmittingForm(true);
    try {
      const payload = {
        date: new Date().toISOString().split('T')[0],
        customerName: customerName.trim() || null,
        weightKg: parseFloat(weightKg),
        soapProductId: selectedProductId,
        soapUsedQty: parseFloat(soapUsedQty),
        machineNumber: machineNumber,
        paymentMethod: paymentMethod,
        referenceNumber: paymentMethod === 'Gcash' ? referenceNumber.trim() : null,
        services: payloadServices,
      };

      const response = await api.post('/api/transactions', payload);
      setFormSuccess('Transaction successfully recorded!');
      
      // Reset Quick Entry fields
      setCustomerName('');
      setWeightKg('');
      setSoapUsedQty('');
      setSelectedProductId('');
      setMachineNumber('Machine 1');
      setPaymentMethod('Cash');
      setReferenceNumber('');
      setSelectedServices({});
      setCustomRates({});

      // Set and trigger receipt modal
      setReceiptTx(response.data);
      setOpenReceiptModal(true);

      // Reload lists
      await loadAllData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to record wash transaction.');
      console.error(err);
    } finally {
      setSubmittingForm(false);
    }
  };

  const handleMarkAsPickedUp = async (id) => {
    if (!window.confirm('Are you sure you want to mark this transaction as picked up?')) {
      return;
    }
    try {
      await api.put(`/api/transactions/${id}/pickup`);
      await fetchRecentTransactions();
      await fetchStats();
    } catch (err) {
      console.error('Failed to mark transaction as picked up.', err);
      alert(err.response?.data?.message || 'Failed to mark transaction as picked up.');
    }
  };

  const handlePrintReceipt = () => {
    const printContent = document.getElementById('printable-dashboard-receipt');
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    window.location.reload();
  };

  // Remaining Soap calculation helper for real time form update
  const getRemainingSoap = () => {
    if (!selectedProductId || !soapUsedQty) return null;
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return null;
    const remaining = prod.quantity - parseFloat(soapUsedQty);
    return isNaN(remaining) ? null : remaining;
  };

  const selectedProductDetails = products.find(p => p.id === selectedProductId);
  const calculatedRemainingSoap = getRemainingSoap();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const lowStockWarnings = stats?.soapStocks?.filter(p => p.isLow) || [];

  return (
    <Box sx={{ flexGrow: 1, pb: 4 }}>
      {/* Welcome Banner */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
          Welcome back, {user?.fullName}!
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Terminal Console — {user?.branch?.name || 'Shared Branch / Global Headquarter'}
        </Typography>
      </Box>

      {/* Critical Stock Alerts */}
      {lowStockWarnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 4, borderRadius: 3, border: '1px solid #ffe0b2' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon />
            Low Stock Warnings detected
          </Typography>
          <ul style={{ margin: '4px 0 0 20px', padding: 0 }}>
            {lowStockWarnings.map(p => (
              <li key={p.id} style={{ fontSize: '0.85rem' }}>
                <strong>{p.name}</strong> has only <strong>{(p.currentStock ?? 0).toFixed(1)} {p.unit}</strong> left! (Reorder point: {p.minStock ?? 20.0} {p.unit})
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Dashboard Panels */}
      <Grid container spacing={4}>
        {/* Quick Entry Form Column */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <LaundryIcon color="primary" />
                Quick Laundry Wash Entry
              </Typography>

              {formSuccess && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>{formSuccess}</Alert>}
              {formError && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{formError}</Alert>}

              <Box component="form" onSubmit={handleQuickSubmit}>
                <Stack spacing={3}>
                  <TextField
                    fullWidth
                    label="Customer Name (Optional)"
                    placeholder="e.g. Walk-in Customer"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />

                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 'medium' }}>
                      Select Washing Machine *
                    </Typography>
                    <ToggleButtonGroup
                      value={machineNumber}
                      exclusive
                      onChange={(e, val) => { if (val) setMachineNumber(val); }}
                      fullWidth
                      color="primary"
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1,
                        '& .MuiToggleButton-root': {
                          borderRadius: '8px !important',
                          border: '1px solid !important',
                          borderColor: 'divider',
                          flex: '1 1 45%',
                          fontWeight: 'bold',
                          py: 1.25,
                        }
                      }}
                    >
                      <ToggleButton value="Machine 1">Machine 1</ToggleButton>
                      <ToggleButton value="Machine 2">Machine 2</ToggleButton>
                      <ToggleButton value="Machine 3">Machine 3</ToggleButton>
                      <ToggleButton value="Machine 4">Machine 4</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>

                  <TextField
                    required
                    fullWidth
                    type="number"
                    label="Wash Weight (kg)"
                    placeholder="0.00"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">kg</InputAdornment>,
                      inputProps: { min: "0.01", step: "0.01" }
                    }}
                  />

                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 'medium' }}>
                      Add Services & Rates *
                    </Typography>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => setOpenServicesDialog(true)}
                      sx={{ py: 1.5, mb: 1, fontWeight: 'bold', borderRadius: 2 }}
                    >
                      Choose Services ({Object.keys(selectedServices).length} Selected)
                    </Button>
                    
                    {Object.keys(selectedServices).length > 0 && (
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {Object.entries(selectedServices).map(([id, qty]) => {
                          const serviceId = Number(id);
                          const service = servicesList.find(s => s.id === serviceId);
                          const rate = customRates[serviceId] !== undefined ? customRates[serviceId] : (service ? service.rate : 0);
                          return (
                            <Chip
                              key={id}
                              label={`${service?.name || 'Service'} (x${qty}) - ₱${(Number(rate || 0) * qty).toFixed(2)}`}
                              onDelete={() => {
                                setSelectedServices(prev => {
                                  const updated = { ...prev };
                                  delete updated[id];
                                  return updated;
                                });
                              }}
                              color="primary"
                              variant="outlined"
                              size="small"
                            />
                          );
                        })}
                      </Paper>
                    )}
                  </Box>

                  <Box sx={{ gridColumn: 'span 2' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 'medium' }}>
                      Mode of Payment *
                    </Typography>
                    <ToggleButtonGroup
                      value={paymentMethod}
                      exclusive
                      onChange={(e, val) => { if (val) setPaymentMethod(val); }}
                      fullWidth
                      color="primary"
                      sx={{
                        display: 'flex',
                        gap: 1,
                        '& .MuiToggleButton-root': {
                          borderRadius: '8px !important',
                          border: '1px solid !important',
                          borderColor: 'divider',
                          fontWeight: 'bold',
                          py: 1.5,
                        }
                      }}
                    >
                      <ToggleButton value="Cash">Cash</ToggleButton>
                      <ToggleButton value="Gcash">GCash</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        required
                        fullWidth
                        select
                        label="Soap Product Used"
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(Number(e.target.value))}
                        helperText={
                          selectedProductDetails
                            ? `Available: ${selectedProductDetails.quantity.toFixed(2)} ${selectedProductDetails.unit}`
                            : 'Select product'
                        }
                      >
                        {products.map((p) => (
                          <MenuItem key={p.id} value={p.id}>
                            {p.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        required
                        fullWidth
                        type="number"
                        label="Soap Amount Utilized"
                        value={soapUsedQty}
                        onChange={(e) => setSoapUsedQty(e.target.value)}
                        placeholder="0.00"
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              {selectedProductDetails ? selectedProductDetails.unit : 'unit'}
                            </InputAdornment>
                          ),
                          inputProps: { min: "0.00", step: "0.01" }
                        }}
                      />
                    </Grid>
                  </Grid>

                  {/* Soap level display */}
                  <Paper variant="outlined" sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'background.default' }}>
                    <Typography variant="body2" color="text.secondary">Projected Soap Balance Stock:</Typography>
                    {calculatedRemainingSoap !== null ? (
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: calculatedRemainingSoap < 0 ? 'error.main' : 'success.main' }}>
                        {calculatedRemainingSoap.toFixed(2)} {selectedProductDetails?.unit}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.disabled">—</Typography>
                    )}
                  </Paper>

                  {paymentMethod === 'Gcash' && (
                    <Card variant="outlined" sx={{ p: 2, border: '1px solid #90caf9', bgcolor: '#e3f2fd', borderRadius: 3 }}>
                      <Stack spacing={2} sx={{ alignItems: 'center' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.dark', display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CheckIcon color="primary" />
                          Scan & Pay GCash QR
                        </Typography>
                        
                        <Box
                          component="img"
                          src="/qr/qrcode.jpg"
                          alt="GCash QR Code"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (!e.target.parentNode.querySelector('.qr-error-msg')) {
                              e.target.parentNode.innerHTML += `
                                <div class="qr-error-msg" style="border: 2px dashed #90caf9; padding: 15px; border-radius: 8px; background: #fff; color: #1565c0; font-size: 0.8rem; text-align: center;">
                                  <b>qrcode.jpg</b> not found.<br/>
                                  Place QR image in <b>public/qr/qrcode.jpg</b>
                                </div>
                              `;
                            }
                          }}
                          sx={{
                            width: 180,
                            height: 180,
                            borderRadius: 2,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                            border: '2px solid white',
                          }}
                        />
                        
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
                            GCash Account: 0976 406 0979
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            Once paid, key in the GCash Reference Number below:
                          </Typography>
                        </Box>
                        
                        <TextField
                          required
                          fullWidth
                          size="small"
                          label="Last 4 digits of GCash Ref"
                          placeholder="e.g. 1234"
                          value={referenceNumber}
                          onChange={(e) => setReferenceNumber(e.target.value)}
                          inputProps={{ maxLength: 4 }}
                          sx={{ bgcolor: 'white', borderRadius: 1 }}
                        />
                      </Stack>
                    </Card>
                  )}

                  {/* Receipt Billing Review */}
                  {Object.keys(selectedServices).length > 0 && (
                    <Card variant="outlined" sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: '#fafafa' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PrintIcon sx={{ fontSize: 16 }} />
                        Invoice Breakdown
                      </Typography>
                      <Stack spacing={1}>
                        {Object.entries(selectedServices).map(([id, qty]) => {
                          const serviceId = Number(id);
                          const service = servicesList.find(s => s.id === serviceId);
                          const rate = customRates[serviceId] !== undefined ? customRates[serviceId] : (service ? service.rate : 0);
                          return (
                            <Box key={id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2" color="text.primary">
                                {service?.name} <Box component="span" sx={{ color: 'text.secondary' }}>x{qty}</Box>
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                ₱{(Number(rate || 0) * qty).toFixed(2)}
                              </Typography>
                            </Box>
                          );
                        })}
                        <Divider sx={{ my: 1 }} />
                        
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            p: 1.5,
                            borderRadius: 2,
                            background: 'linear-gradient(135deg, #0b5394 0%, #073763 100%)',
                            color: 'white',
                          }}
                        >
                           <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Total Billing Price:</Typography>
                           <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                             ₱{Number(calculateTotalPrice() || 0).toFixed(2)}
                           </Typography>
                        </Box>
                      </Stack>
                    </Card>
                  )}

                  {/* Validation Warning */}
                  {calculatedRemainingSoap !== null && calculatedRemainingSoap < 0 && (
                    <Alert severity="error" size="small" sx={{ py: 0 }}>
                      Remaining soap cannot be negative! Please adjust Soap Used quantity or top-up stock.
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    disabled={submittingForm || (calculatedRemainingSoap !== null && calculatedRemainingSoap < 0)}
                    variant="contained"
                    fullWidth
                    startIcon={submittingForm ? <CircularProgress size={20} color="inherit" /> : <LaundryIcon />}
                    sx={{ py: 1.5, fontWeight: 'bold' }}
                  >
                    {submittingForm ? 'Saving Transaction...' : 'Record Transaction'}
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Entries & Stats Column */}
        <Grid item xs={12} md={5}>
          <Stack spacing={3}>
            {/* Today's Count Banner for Employee */}
            <Card sx={{ bgcolor: 'primary.dark', color: 'white' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle2" sx={{ opacity: 0.8, textTransform: 'uppercase' }}>
                  My Record Totals Today
                </Typography>
                <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 'bold' }}>{stats?.totalTransactionsToday}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>Washes Done</Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 'bold' }}>{stats?.totalKgWashedToday != null ? stats.totalKgWashedToday.toFixed(1) : '0.0'}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>Total Weight (kg)</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* Recent Transactions List */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  My Recent Entries
                </Typography>
                {recentTransactions.length > 0 ? (
                  <List>
                    {recentTransactions.map((tx, idx) => (
                      <React.Fragment key={tx.id}>
                        <ListItem
                          sx={{ px: 0, py: 1.5 }}
                          secondaryAction={
                            <Stack direction="row" spacing={0.5}>
                              <IconButton
                                edge="end"
                                aria-label="print"
                                onClick={() => { setReceiptTx(tx); setOpenReceiptModal(true); }}
                                color="primary"
                                size="small"
                                title="View/Print Receipt"
                              >
                                <PrintIcon />
                              </IconButton>
                              {!tx.pickedUp && (
                                <IconButton
                                  edge="end"
                                  aria-label="pickup"
                                  onClick={() => handleMarkAsPickedUp(tx.id)}
                                  color="success"
                                  size="small"
                                  title="Mark as Picked Up"
                                >
                                  <SuccessIcon />
                                </IconButton>
                              )}
                            </Stack>
                          }
                        >
                          <ListItemText
                            primary={tx.customerName || 'Anonymous Customer'}
                            primaryTypographyProps={{ fontWeight: 600 }}
                            secondary={
                              <Box sx={{ mt: 0.5 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                  {tx.date} • {tx.machineNumber} • {tx.weightKg} kg washed • {tx.soapUsedQty} {tx.soapProduct?.unit} soap used
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                                  <Chip
                                    label={tx.paymentMethod === 'Gcash' ? `GCash (${tx.referenceNumber || '—'})` : 'Cash'}
                                    size="small"
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                  />
                                  <Chip
                                    label={tx.pickedUp ? `Picked Up (${calculateDurationInShop(tx.createdAt, tx.pickedUpAt)})` : `In Shop (${calculateDurationInShop(tx.createdAt, tx.pickedUpAt)})`}
                                    color={tx.pickedUp ? 'success' : 'warning'}
                                    variant="outlined"
                                    size="small"
                                    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 'bold' }}
                                  />
                                  {tx.serviceItems?.map((item, idx) => (
                                    <Chip
                                      key={idx}
                                      label={`${item.laundryService?.name || 'Service'} (x${item.quantity})`}
                                      size="small"
                                      variant="outlined"
                                      sx={{ height: 20, fontSize: '0.7rem' }}
                                    />
                                  ))}
                                </Box>
                              </Box>
                            }
                          />
                        </ListItem>
                        {idx < recentTransactions.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">No laundry entries recorded today.</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Printable Receipt Dialog */}
      <Dialog open={openReceiptModal} onClose={() => setOpenReceiptModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Transaction Summary & Invoice</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {/* Printable Ticket Receipt Layout */}
          <Box id="printable-dashboard-receipt" sx={{ p: 3, fontFamily: 'monospace', color: 'black', bgcolor: 'white' }}>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>LAUNDRY INVENTORY SYSTEM</Typography>
              <Typography variant="body2">Branch Terminal</Typography>
              <Typography variant="caption" color="text.secondary">Logged By: {user?.fullName}</Typography>
              <Divider sx={{ my: 1.5, borderColor: 'black' }} />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2">Invoice #: T-00{receiptTx?.id}</Typography>
              <Typography variant="body2">Date: {receiptTx?.date}</Typography>
              <Typography variant="body2">Customer: {receiptTx?.customerName || 'Walk-in'}</Typography>
              <Typography variant="body2">Machine: {receiptTx?.machineNumber}</Typography>
              <Typography variant="body2">Weight: {receiptTx?.weightKg} kg</Typography>
              <Typography variant="body2">Soap Used: {receiptTx?.soapUsedQty} {receiptTx?.soapProduct?.unit || 'unit'}</Typography>
              <Typography variant="body2">
                Pickup Status: {receiptTx?.pickedUp 
                  ? `Picked Up (${calculateDurationInShop(receiptTx.createdAt, receiptTx.pickedUpAt)})` 
                  : `In Shop (${calculateDurationInShop(receiptTx?.createdAt, receiptTx?.pickedUpAt)})`}
              </Typography>
            </Box>

            <Divider sx={{ borderStyle: 'dashed', my: 1.5, borderColor: 'black' }} />
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>SERVICES CHARGED:</Typography>
            <Stack spacing={0.5}>
              {receiptTx?.serviceItems?.map((item, idx) => (
                <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">{item.laundryService?.name} x{item.quantity}</Typography>
                  <Typography variant="body2">₱{(item.priceAtTransaction * item.quantity).toFixed(2)}</Typography>
                </Box>
              ))}
            </Stack>

            <Divider sx={{ my: 2, borderColor: 'black' }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>TOTAL BILL:</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                ₱{receiptTx?.totalAmount?.toFixed(2)}
              </Typography>
            </Box>

            <Divider sx={{ borderStyle: 'dashed', my: 2, borderColor: 'black' }} />

            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>Payment Details</Typography>
              <Typography variant="body2" color="text.secondary">
                Mode: {receiptTx?.paymentMethod === 'Gcash' ? 'GCash' : 'Cash'}
              </Typography>
              {receiptTx?.paymentMethod === 'Gcash' && (
                <Typography variant="body2" color="text.secondary">
                  GCash Ref: XXXX-XXXX-{receiptTx?.referenceNumber}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">Bank: —</Typography>
              <Typography variant="body2" color="text.secondary">Account Name: —</Typography>
            </Box>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                Thank you for washing with us!
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          {!receiptTx?.pickedUp && (
            <Button
              startIcon={<SuccessIcon />}
              variant="contained"
              color="success"
              onClick={async () => {
                await handleMarkAsPickedUp(receiptTx.id);
                setOpenReceiptModal(false);
              }}
            >
              Mark as Picked Up
            </Button>
          )}
          <Button startIcon={<PrintIcon />} variant="outlined" onClick={handlePrintReceipt}>
            Print Receipt
          </Button>
          <Button variant="contained" onClick={() => setOpenReceiptModal(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Services Selection Sub-dialog */}
      <Dialog open={openServicesDialog} onClose={() => setOpenServicesDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Select Laundry Services</DialogTitle>
        <DialogContent dividers sx={{ maxHeight: '50vh', overflowY: 'auto' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search services..."
            value={serviceSearchTerm}
            onChange={(e) => setServiceSearchTerm(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Stack spacing={1.5}>
            {servicesList
              .filter(s => s.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()))
              .map(service => {
                const qty = selectedServices[service.id] || 1;
                const isChecked = selectedServices[service.id] !== undefined;
                const currentRate = customRates[service.id] !== undefined ? customRates[service.id] : service.rate;
                return (
                  <Box key={service.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Checkbox
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedServices(prev => ({ ...prev, [service.id]: 1 }));
                            } else {
                              setSelectedServices(prev => {
                                const updated = { ...prev };
                                delete updated[service.id];
                                return updated;
                              });
                            }
                          }}
                          size="small"
                        />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {service.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ₱{service.rate} / {service.unit}
                          </Typography>
                        </Box>
                      </Box>
                      
                      {isChecked && (
                        <TextField
                          type="number"
                          size="small"
                          label="Qty"
                          value={qty}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (val > 0) {
                              setSelectedServices(prev => ({ ...prev, [service.id]: val }));
                            }
                          }}
                          inputProps={{ min: 1 }}
                          sx={{ width: 80 }}
                        />
                      )}
                    </Box>

                    {isChecked && (
                      <Box sx={{ mt: 1.5, pl: 4.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {isAdmin() ? (
                          <TextField
                            size="small"
                            type="number"
                            label="Price (Edit)"
                            value={currentRate}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val >= 0) {
                                setCustomRates(prev => ({ ...prev, [service.id]: val }));
                              }
                            }}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                              inputProps: { min: "0", step: "0.5" }
                            }}
                            sx={{ width: 120 }}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Rate: ₱{currentRate}
                          </Typography>
                        )}
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                          Sub: ₱{(Number(currentRate || 0) * qty).toFixed(2)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                );
              })}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button variant="contained" onClick={() => setOpenServicesDialog(false)}>
            Apply & Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmployeeDashboard;
