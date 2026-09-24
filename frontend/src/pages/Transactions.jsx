import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
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
  InputAdornment,
  TablePagination,
  CircularProgress,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Checkbox,
  Chip,
  Divider,
  Grid,
  FormControl,
  Select,
  InputLabel,
  Collapse,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  LocalLaundryService as LaundryIcon,
  Refresh as RefreshIcon,
  Print as PrintIcon,
  CheckCircle as SuccessIcon,
  FilterList as FilterIcon,
  InfoOutlined as InfoIcon,
  Edit as EditIcon,
  HourglassEmpty as PendingIcon,
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

const Transactions = () => {
  const { user, isAdmin } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Claim Status Filter State: 'unclaimed' | 'claimed' | 'all'
  const [claimFilter, setClaimFilter] = useState('unclaimed');

  // Claim Confirmation Modal State
  const [openClaimModal, setOpenClaimModal] = useState(false);
  const [targetClaimTx, setTargetClaimTx] = useState(null);
  const [claimSuccessMsg, setClaimSuccessMsg] = useState('');
  const [claiming, setClaiming] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMachineFilter, setSelectedMachineFilter] = useState('All');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('All');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState('All');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState('All');
  const [selectedYearFilter, setSelectedYearFilter] = useState('All');

  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modal Dialog Form State
  const [openModal, setOpenModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [soapUsedQty, setSoapUsedQty] = useState('');
  const [machineNumber, setMachineNumber] = useState('Machine 1');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [referenceNumber, setReferenceNumber] = useState(''); // Last 4 digits reference
  const [selectedServices, setSelectedServices] = useState({}); // serviceId -> quantity
  const [customRates, setCustomRates] = useState({}); // serviceId -> unitPrice manual override
  const [serviceSearchTerm, setServiceSearchTerm] = useState(''); // Service list search term
  const [openServicesDialog, setOpenServicesDialog] = useState(false); // Sub-dialog to select services
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState('laundry');
  const [editingTransactionId, setEditingTransactionId] = useState(null);
  const [transactionDate, setTransactionDate] = useState('');

  // Receipt Modal State
  const [openReceiptModal, setOpenReceiptModal] = useState(false);
  const [receiptTx, setReceiptTx] = useState(null);

  const monthsList = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const yearsList = [2024, 2025, 2026, 2027, 2028];

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/api/transactions');
      setTransactions(response.data);
    } catch (err) {
      setError('Failed to fetch transaction logs.');
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/api/inventory');
      setProducts(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await api.get('/api/services');
      setServicesList(response.data);
    } catch (err) {
      setError('Failed to fetch laundry services list: ' + (err.response?.data?.message || err.message));
      console.error(err);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await api.get('/api/branches');
      setBranches(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    await fetchTransactions();
    await fetchProducts();
    await fetchServices();
    await fetchBranches();
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = () => {
    setEditingTransactionId(null);
    setCategory('laundry');
    setTransactionDate(new Date().toISOString().split('T')[0]);
    setOpenModal(true);
    setModalError('');
    setCustomerName('');
    setWeightKg('');
    setSoapUsedQty('');
    setSelectedProductId('');
    setMachineNumber('Machine 1');
    setPaymentMethod('Cash');
    setReferenceNumber('');
    setSelectedServices({});
    setCustomRates({});
    setServiceSearchTerm('');
    setOpenServicesDialog(false);
  };

  const handleEditTransaction = (tx) => {
    setEditingTransactionId(tx.id);
    setCategory(tx.category || 'laundry');
    setTransactionDate(tx.date || new Date().toISOString().split('T')[0]);
    setCustomerName(tx.customerName || '');
    setWeightKg(tx.weightKg !== null && tx.weightKg !== undefined ? tx.weightKg.toString() : '');
    setSoapUsedQty(tx.soapUsedQty !== null && tx.soapUsedQty !== undefined ? tx.soapUsedQty.toString() : '');
    setSelectedProductId(tx.soapProduct?.id || '');
    setMachineNumber(tx.machineNumber || 'Machine 1');
    setPaymentMethod(tx.paymentMethod || 'Cash');
    setReferenceNumber(tx.referenceNumber || '');

    const services = {};
    const rates = {};
    if (tx.serviceItems) {
      tx.serviceItems.forEach(item => {
        services[item.laundryService.id] = item.quantity;
        rates[item.laundryService.id] = item.priceAtTransaction;
      });
    }
    setSelectedServices(services);
    setCustomRates(rates);

    setModalError('');
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
  };

  const calculateTotalPrice = () => {
    return Object.entries(selectedServices).reduce((sum, [id, qty]) => {
      const serviceId = Number(id);
      const service = servicesList.find(s => s.id === serviceId);
      const rate = customRates[serviceId] !== undefined ? customRates[serviceId] : (service ? service.rate : 0);
      return sum + (rate * qty);
    }, 0);
  };

  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    setModalError('');

    if (category === 'laundry') {
      if (!selectedProductId) {
        setModalError('Soap product selection is required.');
        return;
      }
      if (!weightKg || parseFloat(weightKg) <= 0) {
        setModalError('Weight must be greater than 0 kg.');
        return;
      }
      if (!soapUsedQty || parseFloat(soapUsedQty) < 0) {
        setModalError('Soap used quantity cannot be negative.');
        return;
      }
      if (!machineNumber) {
        setModalError('Machine number selection is required.');
        return;
      }
    }

    if (paymentMethod === 'Gcash') {
      const trimmedRef = referenceNumber.trim();
      if (!trimmedRef || trimmedRef.length !== 4 || isNaN(Number(trimmedRef))) {
        setModalError('Please enter exactly the last 4 digits of the GCash reference number.');
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
      setModalError('Please select at least one service.');
      return;
    }

    if (category === 'laundry') {
      const selectedProduct = products.find(p => p.id === selectedProductId);
      // Account for original stock if editing
      let availableStock = selectedProduct ? selectedProduct.quantity : 0;
      if (editingTransactionId) {
        const originalTx = transactions.find(t => t.id === editingTransactionId);
        if (originalTx && originalTx.soapProduct?.id === selectedProductId) {
          availableStock += originalTx.soapUsedQty || 0;
        }
      }
      if (selectedProduct && availableStock < parseFloat(soapUsedQty)) {
        setModalError(`Insufficient stock! ${selectedProduct.name} has only ${availableStock.toFixed(2)} ${selectedProduct.unit} available.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        category: category,
        date: transactionDate,
        customerName: customerName.trim() || null,
        weightKg: category === 'laundry' ? parseFloat(weightKg) : null,
        soapProductId: category === 'laundry' ? selectedProductId : null,
        soapUsedQty: category === 'laundry' ? parseFloat(soapUsedQty) : null,
        machineNumber: category === 'laundry' ? machineNumber : null,
        paymentMethod: paymentMethod,
        referenceNumber: paymentMethod === 'Gcash' ? referenceNumber.trim() : null,
        services: payloadServices,
      };

      let response;
      if (editingTransactionId) {
        response = await api.put(`/api/transactions/${editingTransactionId}`, payload);
      } else {
        response = await api.post('/api/transactions', payload);
        // After inputting transaction, place in unclaimed view
        setClaimFilter('unclaimed');
        setPage(0);
      }
      handleCloseModal();
      setReceiptTx(response.data);
      setOpenReceiptModal(true);
      loadData(); // Reload table
    } catch (err) {
      setModalError(err.response?.data?.message || 'Error occurred while saving transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInitiateClaim = (tx) => {
    setTargetClaimTx(tx);
    setOpenClaimModal(true);
  };

  const handleConfirmClaim = async () => {
    if (!targetClaimTx) return;
    setClaiming(true);
    try {
      await api.put(`/api/transactions/${targetClaimTx.id}/pickup`);
      setOpenClaimModal(false);
      setOpenReceiptModal(false);
      setClaimSuccessMsg(`Laundry for ${targetClaimTx.customerName || 'customer'} marked as claimed.`);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark transaction as claimed.');
      console.error(err);
    } finally {
      setClaiming(false);
    }
  };

  const getRemainingSoap = () => {
    if (!selectedProductId || !soapUsedQty) return null;
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return null;
    let currentStock = prod.quantity;
    if (editingTransactionId) {
      const originalTx = transactions.find(t => t.id === editingTransactionId);
      if (originalTx && originalTx.soapProduct?.id === selectedProductId) {
        currentStock += originalTx.soapUsedQty || 0;
      }
    }
    const remaining = currentStock - parseFloat(soapUsedQty);
    return isNaN(remaining) ? null : remaining;
  };

  const selectedProductDetails = products.find(p => p.id === selectedProductId);
  const calculatedRemainingSoap = getRemainingSoap();

  // Multi-tier filtering matching Android's dropdown selectors & Claimed/Unclaimed filter
  const filteredTransactions = transactions.filter((tx) => {
    // Claim status filter
    if (claimFilter === 'unclaimed' && tx.pickedUp) return false;
    if (claimFilter === 'claimed' && !tx.pickedUp) return false;

    // Search filter
    const searchString = searchTerm.toLowerCase();
    const customer = (tx.customerName || 'anonymous').toLowerCase();
    const loggedBy = (tx.user?.fullName || '').toLowerCase();
    const soapName = (tx.soapProduct?.name || '').toLowerCase();
    const matchesSearch = customer.includes(searchString) || loggedBy.includes(searchString) || soapName.includes(searchString);
    if (!matchesSearch) return false;

    // Branch filter
    if (selectedBranchFilter !== 'All' && tx.branch?.id !== Number(selectedBranchFilter)) return false;

    // Payment filter
    if (selectedPaymentFilter !== 'All' && tx.paymentMethod?.toLowerCase() !== selectedPaymentFilter.toLowerCase()) return false;

    // Machine filter
    if (selectedMachineFilter !== 'All' && tx.machineNumber !== selectedMachineFilter) return false;

    // Month filter
    if (selectedMonthFilter !== 'All') {
      const txMonth = new Date(tx.date).getMonth() + 1;
      if (txMonth !== Number(selectedMonthFilter)) return false;
    }

    // Year filter
    if (selectedYearFilter !== 'All') {
      const txYear = new Date(tx.date).getFullYear();
      if (txYear !== Number(selectedYearFilter)) return false;
    }

    return true;
  });

  // Count unclaimed vs claimed
  const unclaimedCount = transactions.filter(t => !t.pickedUp).length;
  const claimedCount = transactions.filter(t => !!t.pickedUp).length;

  // Pagination Handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handlePrintReceipt = () => {
    const printContent = document.getElementById('printable-receipt-area');
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    window.location.reload();
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val || 0);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Top Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 'extraBold', color: 'primary.dark' }}>
          Transactions History
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={loadData} color="primary" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenModal}
            sx={{ fontWeight: 'bold' }}
          >
            Record Wash
          </Button>
        </Box>
      </Box>

      {/* Claimed and Unclaimed Buttons */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
        <Button
          variant={claimFilter === 'unclaimed' ? 'contained' : 'outlined'}
          color="warning"
          startIcon={<PendingIcon />}
          onClick={() => { setClaimFilter('unclaimed'); setPage(0); }}
          sx={{
            fontWeight: 'bold',
            borderRadius: 2.5,
            px: 3,
            py: 1,
            textTransform: 'none',
            fontSize: '0.95rem',
            boxShadow: claimFilter === 'unclaimed' ? '0 4px 12px rgba(245, 127, 23, 0.3)' : 'none',
          }}
        >
          Unclaimed ({unclaimedCount})
        </Button>
        <Button
          variant={claimFilter === 'claimed' ? 'contained' : 'outlined'}
          color="success"
          startIcon={<SuccessIcon />}
          onClick={() => { setClaimFilter('claimed'); setPage(0); }}
          sx={{
            fontWeight: 'bold',
            borderRadius: 2.5,
            px: 3,
            py: 1,
            textTransform: 'none',
            fontSize: '0.95rem',
            boxShadow: claimFilter === 'claimed' ? '0 4px 12px rgba(46, 125, 50, 0.3)' : 'none',
          }}
        >
          Claimed ({claimedCount})
        </Button>
        <Button
          variant={claimFilter === 'all' ? 'contained' : 'outlined'}
          color="inherit"
          onClick={() => { setClaimFilter('all'); setPage(0); }}
          sx={{
            fontWeight: 'bold',
            borderRadius: 2.5,
            px: 2.5,
            py: 1,
            textTransform: 'none',
            fontSize: '0.95rem',
            borderColor: 'divider',
            color: claimFilter === 'all' ? 'text.primary' : 'text.secondary',
          }}
        >
          All ({transactions.length})
        </Button>
      </Box>

      {claimFilter === 'unclaimed' && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, fontStyle: 'italic' }}>
          * Active orders awaiting pickup. Orders unclaimed for 2+ weeks are automatically marked as claimed.
        </Typography>
      )}

      {claimSuccessMsg && (
        <Alert severity="success" onClose={() => setClaimSuccessMsg('')} sx={{ mb: 2.5, borderRadius: 2 }}>
          {claimSuccessMsg}
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Main card panel with search & filter panel */}
      <Card sx={{ mb: 3, p: 2.5, borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.05)' }}>
        <Stack spacing={2}>
          {/* Search customer and Filters toggle row */}
          <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
            <TextField
              placeholder="Search customer..."
              size="small"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(0);
              }}
              sx={{ flexGrow: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant={showFilters ? 'contained' : 'outlined'}
              startIcon={<FilterIcon />}
              onClick={() => setShowFilters(!showFilters)}
              sx={{ fontWeight: 'bold', borderRadius: 2, px: 3 }}
            >
              Filters
            </Button>
          </Stack>

          {/* Collapsible Filter Selectors Matching Android dropdowns */}
          <Collapse in={showFilters}>
            <Grid container spacing={2} sx={{ pt: 1 }}>
              {/* Branch Selection */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Branch</InputLabel>
                  <Select
                    value={selectedBranchFilter}
                    label="Branch"
                    onChange={(e) => {
                      setSelectedBranchFilter(e.target.value);
                      setPage(0);
                    }}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="All">All Branches</MenuItem>
                    {branches.map(b => (
                      <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Payment Selection */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Payment</InputLabel>
                  <Select
                    value={selectedPaymentFilter}
                    label="Payment"
                    onChange={(e) => {
                      setSelectedPaymentFilter(e.target.value);
                      setPage(0);
                    }}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="All">All</MenuItem>
                    <MenuItem value="Cash">Cash</MenuItem>
                    <MenuItem value="Gcash">GCash</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Month Selection */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Month</InputLabel>
                  <Select
                    value={selectedMonthFilter}
                    label="Month"
                    onChange={(e) => {
                      setSelectedMonthFilter(e.target.value);
                      setPage(0);
                    }}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="All">All Months</MenuItem>
                    {monthsList.map(m => (
                      <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Year Selection */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Year</InputLabel>
                  <Select
                    value={selectedYearFilter}
                    label="Year"
                    onChange={(e) => {
                      setSelectedYearFilter(e.target.value);
                      setPage(0);
                    }}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="All">All Years</MenuItem>
                    {yearsList.map(y => (
                      <MenuItem key={y} value={y}>{y}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Machine Selection (Extra Row filter) */}
              <Grid item xs={12}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', alignSelf: 'center', mr: 1, color: 'text.secondary' }}>
                    Machine Allocation:
                  </Typography>
                  {['All', 'Machine 1', 'Machine 2', 'Machine 3', 'Machine 4'].map((m) => (
                    <Button
                      key={m}
                      variant={selectedMachineFilter === m ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => {
                        setSelectedMachineFilter(m);
                        setPage(0);
                      }}
                      sx={{ borderRadius: 2, fontWeight: 'bold', textTransform: 'none', px: 2 }}
                    >
                      {m}
                    </Button>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </Collapse>
        </Stack>
      </Card>

      {/* Transaction Logs List of Cards */}
      <Box sx={{ mb: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : filteredTransactions.length > 0 ? (
          <Stack spacing={2}>
            {filteredTransactions
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((tx) => (
                <Card
                  key={tx.id}
                  onClick={() => { setReceiptTx(tx); setOpenReceiptModal(true); }}
                  sx={{
                    borderRadius: 3,
                    boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                    border: '1px solid rgba(0,0,0,0.05)',
                    p: 2,
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }
                  }}
                >
                  <Stack spacing={1.5}>
                    {/* Header: customerName and totalAmount */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                        {tx.customerName || 'Anonymous Customer'}
                      </Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {formatCurrency(tx.totalAmount)}
                      </Typography>
                    </Box>

                    {/* Subtitle: Category, Date, Machine allocation and kg weight */}
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.75rem' }}>
                      <span style={{ textTransform: 'capitalize', fontWeight: 'bold', color: '#ec4899' }}>{tx.category || 'laundry'}</span> • {tx.date} {tx.category === 'laundry' && `• ${tx.machineNumber || 'No Machine'} • ${tx.weightKg ? tx.weightKg.toFixed(1) + ' kg washed' : '—'}`}
                    </Typography>

                    {/* Chips Row and Action buttons */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {/* Payment MOP chip */}
                        <Chip
                          label={tx.paymentMethod === 'Gcash' ? 'GCash' : 'Cash'}
                          size="small"
                          sx={{
                            fontWeight: 'bold',
                            fontSize: '0.65rem',
                            height: 22,
                            bgcolor: '#f1f5f9',
                            color: 'text.primary'
                          }}
                        />

                        {/* Branch allocation chip */}
                        {tx.branch?.name && (
                          <Chip
                            label={tx.branch.name}
                            size="small"
                            sx={{
                              fontWeight: 'bold',
                              fontSize: '0.65rem',
                              height: 22,
                              bgcolor: '#e3f2fd',
                              color: 'primary.main'
                            }}
                          />
                        )}

                        {/* Claim/Pickup Status chip */}
                        <Chip
                          label={tx.pickedUp ? `Claimed (${calculateDurationInShop(tx.createdAt, tx.pickedUpAt)})` : `Unclaimed (${calculateDurationInShop(tx.createdAt, tx.pickedUpAt)})`}
                          size="small"
                          sx={{
                            fontWeight: 'bold',
                            fontSize: '0.65rem',
                            height: 22,
                            bgcolor: tx.pickedUp ? '#e8f5e9' : '#fffde7',
                            color: tx.pickedUp ? '#2e7d32' : '#f57f17',
                            border: '1px solid',
                            borderColor: tx.pickedUp ? '#c8e6c9' : '#fff9c4'
                          }}
                        />
                      </Stack>

                      {/* Action buttons: Claimed button (for unclaimed), Edit, and Info */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {!tx.pickedUp && (
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<SuccessIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInitiateClaim(tx);
                            }}
                            sx={{
                              fontWeight: 'bold',
                              textTransform: 'none',
                              fontSize: '0.8rem',
                              px: 2,
                              py: 0.4,
                              borderRadius: 2,
                              boxShadow: 'none',
                              '&:hover': {
                                boxShadow: '0 2px 8px rgba(46, 125, 50, 0.35)'
                              }
                            }}
                          >
                            Claimed
                          </Button>
                        )}
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTransaction(tx);
                          }}
                          color="primary"
                          size="small"
                          sx={{ bgcolor: '#e3f2fd', '&:hover': { bgcolor: '#bbdefb' } }}
                          title="Edit Transaction"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            setReceiptTx(tx);
                            setOpenReceiptModal(true);
                          }}
                          color="default"
                          size="small"
                          sx={{ bgcolor: '#f4f4f5', '&:hover': { bgcolor: '#e4e4e7' } }}
                          title="View Receipt"
                        >
                          <InfoIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </IconButton>
                      </Box>
                    </Box>
                  </Stack>
                </Card>
              ))}
          </Stack>
        ) : (
          <Card sx={{ p: 6, textAlign: 'center', border: '1px dashed #ccc', borderRadius: 3 }}>
            <Typography color="text.secondary">No laundry transactions found.</Typography>
          </Card>
        )}
      </Box>

      {/* Pagination component */}
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredTransactions.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      {/* Record/Edit Transaction Modal Dialog */}
      <Dialog open={openModal} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <LaundryIcon color="primary" />
          {editingTransactionId ? 'Edit Transaction' : 'Record Laundry Wash'}
        </DialogTitle>
        <Box component="form" onSubmit={handleSaveTransaction}>
          <DialogContent dividers sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {modalError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {modalError}
              </Alert>
            )}

            <Stack spacing={3}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 'medium' }}>
                  Transaction Type / Category *
                </Typography>
                <ToggleButtonGroup
                  value={category}
                  exclusive
                  onChange={(e, val) => { if (val) setCategory(val); }}
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
                      py: 1.2,
                    }
                  }}
                >
                  <ToggleButton value="laundry">Laundry</ToggleButton>
                  <ToggleButton value="Gym">Gym</ToggleButton>
                  <ToggleButton value="pickleball">Pickleball</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <TextField
                fullWidth
                label="Customer Name (Optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name..."
              />

              <TextField
                required
                fullWidth
                type="date"
                label="Transaction Date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />

              {category === 'laundry' && (
                <>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 'medium' }}>
                      Washing Machine *
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
                          py: 1.5,
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
                    label="Weight (kg)"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="0.00"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">kg</InputAdornment>,
                      inputProps: { min: "0.01", step: "0.01" }
                    }}
                  />
                </>
              )}

              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 'medium' }}>
                  Select Services & Quantities *
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

              <Box>
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

              {paymentMethod === 'Gcash' && (
                <Stack spacing={2} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main', textAlign: 'center' }}>
                    GCash Payment Verification
                  </Typography>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
                      GCash Number: 000
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      Send payment directly to the GCash number.
                    </Typography>
                  </Box>
                  <TextField
                    required
                    fullWidth
                    label="Last 4 Digits of GCash Reference Number"
                    placeholder="e.g. 1234"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    inputProps={{ maxLength: 4 }}
                    helperText="Please input the last 4 digits of the receipt reference."
                  />
                </Stack>
              )}

              {category === 'laundry' && (
                <>
                  <TextField
                    required
                    fullWidth
                    select
                    label="Soap Product Used"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(Number(e.target.value))}
                    helperText={
                      selectedProductDetails
                        ? `Available Stock: ${selectedProductDetails.quantity.toFixed(2)} ${selectedProductDetails.unit}`
                        : 'Select product to check stock level'
                    }
                  >
                    {products.map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.name}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    required
                    fullWidth
                    type="number"
                    label="Soap Amount Used"
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

                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderRadius: 2,
                      bgcolor: 'background.default',
                      borderColor: calculatedRemainingSoap !== null && calculatedRemainingSoap < 0 ? 'error.light' : 'divider',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">Remaining Soap Stock After Wash:</Typography>
                    {calculatedRemainingSoap !== null ? (
                      <Typography
                         variant="subtitle1"
                         sx={{
                           fontWeight: 'bold',
                           color: calculatedRemainingSoap < 0 ? 'error.main' : 'success.main',
                         }}
                      >
                        {calculatedRemainingSoap.toFixed(2)} {selectedProductDetails?.unit}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.disabled">—</Typography>
                    )}
                  </Paper>
                </>
              )}

              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: 2,
                  bgcolor: 'primary.light',
                  color: 'primary.contrastText',
                  borderColor: 'primary.main',
                  backgroundImage: 'linear-gradient(to right, rgba(11,83,148,0.95), rgba(11,83,148,0.8))',
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 'medium', color: 'white' }}>Total Billing Price:</Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 'bold',
                    color: 'white',
                  }}
                >
                  ₱{calculateTotalPrice().toFixed(2)}
                </Typography>
              </Paper>

              {category === 'laundry' && calculatedRemainingSoap !== null && calculatedRemainingSoap < 0 && (
                <Alert severity="error" sx={{ py: 0 }}>
                  Remaining soap cannot be negative. Please check soap used quantity.
                </Alert>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={handleCloseModal} color="inherit">Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting || (category === 'laundry' && calculatedRemainingSoap !== null && calculatedRemainingSoap < 0)}
              startIcon={submitting && <CircularProgress size={16} color="inherit" />}
            >
              {submitting ? 'Saving...' : (editingTransactionId ? 'Save Changes' : 'Record Wash')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Choose Services Popup Dialog */}
      <Dialog open={openServicesDialog} onClose={() => setOpenServicesDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <LaundryIcon color="primary" />
          Select Services & Quantities
        </DialogTitle>
        <DialogContent dividers sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search services..."
            value={serviceSearchTerm}
            onChange={(e) => setServiceSearchTerm(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Stack spacing={2.5}>
            {servicesList
              .filter((s) => s.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()))
              .map((service) => {
                const isChecked = selectedServices[service.id] !== undefined;
                const qty = selectedServices[service.id] || 1;
                const currentRate = customRates[service.id] !== undefined ? customRates[service.id] : service.rate;
                return (
                  <Box
                    key={service.id}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      p: 1.5,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: isChecked ? 'primary.light' : 'divider',
                      bgcolor: isChecked ? 'rgba(11, 83, 148, 0.04)' : 'transparent',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
                            Standard: ₱{service.rate != null ? Number(service.rate).toFixed(2) : '0.00'} / {service.unit}
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
                            sx={{ width: 140 }}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Rate: ₱{currentRate != null ? Number(currentRate).toFixed(2) : '0.00'}
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

      {/* Styled Transaction Receipt Dialog */}
      <Dialog open={openReceiptModal} onClose={() => setOpenReceiptModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <SuccessIcon color="success" />
          Transaction Details & Invoice
        </DialogTitle>
        <DialogContent dividers>
          {/* Printable Receipt Area */}
          <Box id="printable-receipt-area" sx={{ p: 1, color: 'text.primary', fontFamily: 'Courier New, monospace' }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              {/* Pinkish accent styling for company branding */}
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#ec4899', letterSpacing: '0.05em' }}>
                TACKY LAUNDRY SERVICE
              </Typography>
              <Typography variant="body2" color="text.secondary">
                123 Laundry Lane, Manila
              </Typography>
              <Typography variant="body2" color="text.secondary">
                tacky@laundry.com
              </Typography>
              <Typography variant="body2" color="text.secondary">
                +63 912 345 6789
              </Typography>
            </Box>

            <Divider sx={{ borderStyle: 'dashed', my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#ec4899' }}>Invoice #</Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>T-00{receiptTx?.id}</Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#ec4899' }}>Customer Name</Typography>
              <Typography variant="body2">{receiptTx?.customerName || 'Anonymous'}</Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#ec4899' }}>Category</Typography>
              <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{receiptTx?.category || 'laundry'}</Typography>
            </Box>

            {receiptTx?.category === 'laundry' && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#ec4899' }}>Machine</Typography>
                  <Typography variant="body2">{receiptTx?.machineNumber || '—'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#ec4899' }}>Weight</Typography>
                  <Typography variant="body2">{receiptTx?.weightKg ? `${receiptTx.weightKg.toFixed(2)} kg` : '—'}</Typography>
                </Box>
              </>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#ec4899' }}>Date</Typography>
              <Typography variant="body2">
                {receiptTx?.date ? new Date(receiptTx.date).toLocaleDateString('en-US') : new Date().toLocaleDateString('en-US')}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#ec4899' }}>Pickup Status</Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: receiptTx?.pickedUp ? 'success.main' : 'warning.main' }}>
                {receiptTx?.pickedUp 
                  ? `Claimed (${calculateDurationInShop(receiptTx.createdAt, receiptTx.pickedUpAt)})` 
                  : `Unclaimed (${calculateDurationInShop(receiptTx?.createdAt, receiptTx?.pickedUpAt)})`}
              </Typography>
            </Box>

            {/* Table layout exactly as shown in layout sketch */}
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, borderRadius: 1 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Particulars</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.85rem' }} align="right">Rate</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.85rem' }} align="center">Qty</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.85rem' }} align="right">Subtotal</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {receiptTx?.serviceItems && receiptTx.serviceItems.length > 0 ? (
                    receiptTx.serviceItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{item.laundryService?.name}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }} align="right">₱{item.priceAtTransaction.toFixed(2)}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }} align="center">{item.quantity}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', fontWeight: 'medium' }} align="right">
                          ₱{(item.priceAtTransaction * item.quantity).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ fontSize: '0.8rem' }}>—</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Stack spacing={0.5} sx={{ alignItems: 'flex-end', mb: 3 }}>
              <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', maxWidth: 200 }}>
                <Typography variant="body2" color="text.secondary">Subtotal:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>₱{receiptTx?.totalAmount?.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', maxWidth: 200 }}>
                <Typography variant="body2" color="text.secondary">Discount:</Typography>
                <Typography variant="body2">₱0.00</Typography>
              </Box>
              <Divider sx={{ width: '100%', maxWidth: 200, my: 0.5 }} />
              <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', maxWidth: 200 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Total:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                  ₱{receiptTx?.totalAmount?.toFixed(2)}
                </Typography>
              </Box>
            </Stack>

            <Divider sx={{ borderStyle: 'dashed', my: 2 }} />

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
              onClick={() => handleInitiateClaim(receiptTx)}
              sx={{ fontWeight: 'bold' }}
            >
              Claimed
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

      {/* Claim Confirmation Dialog with exact note requested */}
      <Dialog
        open={openClaimModal}
        onClose={() => !claiming && setOpenClaimModal(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, p: 1 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <SuccessIcon color="success" />
          Confirm Laundry Claim
        </DialogTitle>
        <DialogContent dividers sx={{ py: 2.5 }}>
          {targetClaimTx && (
            <Box sx={{ mb: 2.5, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  {targetClaimTx.customerName || 'Anonymous Customer'}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  {formatCurrency(targetClaimTx.totalAmount)}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Invoice #T-00{targetClaimTx.id} • {targetClaimTx.category || 'laundry'} • {targetClaimTx.date}
              </Typography>
            </Box>
          )}

          <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 2, border: '1px solid #c8e6c9', textAlign: 'center' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1b5e20' }}>
              Laundry will be marked as claimed
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              The transaction status will update to Claimed and its total amount will be inputted into sales.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', width: '100%', gap: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              color="inherit"
              disabled={claiming}
              onClick={() => setOpenClaimModal(false)}
              sx={{ fontWeight: 'bold', py: 1.2, borderRadius: 2 }}
            >
              No
            </Button>
            <Button
              fullWidth
              variant="contained"
              color="success"
              disabled={claiming}
              onClick={handleConfirmClaim}
              startIcon={claiming ? <CircularProgress size={18} color="inherit" /> : <SuccessIcon />}
              sx={{ fontWeight: 'bold', py: 1.2, borderRadius: 2 }}
            >
              {claiming ? 'Processing...' : 'Yes'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Transactions;
