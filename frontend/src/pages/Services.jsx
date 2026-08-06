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
  Alert,
  IconButton,
  Stack,
  CircularProgress,
  Fab,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';

const Services = () => {
  const { isAdmin } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dialog Add/Edit states
  const [openModal, setOpenModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  
  // Form fields
  const [serviceName, setServiceName] = useState('');
  const [rate, setRate] = useState('');
  const [unit, setUnit] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchServices = async () => {
    try {
      const response = await api.get('/api/services');
      setServices(response.data);
    } catch (err) {
      setError('Failed to fetch services. Check backend connection.');
      console.error(err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    await fetchServices();
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddModal = () => {
    setEditMode(false);
    setSelectedServiceId(null);
    setServiceName('');
    setRate('');
    setUnit('service');
    setFormError('');
    setOpenModal(true);
  };

  const handleOpenEditModal = (service) => {
    setEditMode(true);
    setSelectedServiceId(service.id);
    setServiceName(service.name);
    setRate(service.rate.toString());
    setUnit(service.unit);
    setFormError('');
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!serviceName.trim() || !rate || !unit.trim()) {
      setFormError('Please fill in all required fields.');
      return;
    }

    const rateVal = parseFloat(rate);
    if (isNaN(rateVal) || rateVal < 0) {
      setFormError('Rate must be a non-negative number.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: serviceName.trim(),
        rate: rateVal,
        unit: unit.trim().toLowerCase()
      };

      if (editMode) {
        await api.put(`/api/services/${selectedServiceId}`, payload);
      } else {
        await api.post('/api/services', payload);
      }
      handleCloseModal();
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save service rates.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteService = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the service "${name}"?`)) {
      return;
    }
    try {
      await api.delete(`/api/services/${id}`);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete service.');
      console.error(err);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val || 0);
  };

  return (
    <Box sx={{ flexGrow: 1, pb: 8, position: 'relative' }}>
      {/* Header bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'extraBold', color: 'primary.dark' }}>
            Services & Rates
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage services configurations, standard rates, and billing units.
          </Typography>
        </Box>
        <Box>
          <IconButton onClick={loadData} color="primary" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Role Banner */}
      <Alert severity="success" sx={{ mb: 3, borderRadius: 3, border: '1px solid #c8e6c9', bgcolor: '#e8f5e9', color: '#2e7d32' }}>
        Welcome back, Shop Manager (Admin)!
      </Alert>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Services List of Cards */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : services.length > 0 ? (
        <Grid container spacing={2}>
          {services.map((item) => (
            <Grid item xs={12} key={item.id}>
              <Card
                sx={{
                  borderRadius: 3,
                  boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                  border: '1px solid rgba(0,0,0,0.05)',
                  p: 1.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                {/* Left side details */}
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {item.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Rate Unit: {item.unit}
                  </Typography>
                </Box>

                {/* Right side rate and actions */}
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="subtitle1" sx={{ fontWeight: 'extraBold', color: 'secondary.dark' }}>
                    {formatCurrency(item.rate)}
                  </Typography>
                  {isAdmin() && (
                    <Stack direction="row" spacing={0.5}>
                      <IconButton onClick={() => handleOpenEditModal(item)} color="default" size="small">
                        <EditIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteService(item.id, item.name)} color="error" size="small">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  )}
                </Stack>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Card sx={{ p: 6, textAlign: 'center', border: '1px dashed #ccc', borderRadius: 3 }}>
          <Typography color="text.secondary">No services defined yet.</Typography>
        </Card>
      )}

      {/* FAB to Add Service */}
      {isAdmin() && (
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
          Create Service
        </Fab>
      )}

      {/* Add / Edit Service Dialog */}
      <Dialog open={openModal} onClose={handleCloseModal} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {editMode ? 'Configure Service Details' : 'Establish New Service'}
        </DialogTitle>
        <Box component="form" onSubmit={handleSaveService}>
          <DialogContent dividers>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
            <Stack spacing={2.5}>
              <TextField
                required
                fullWidth
                label="Service Name / Description"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="e.g. Basic Service, Comforter"
              />
              <TextField
                required
                fullWidth
                type="number"
                label="Rate (₱)"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0.00"
                inputProps={{ min: "0.00", step: "0.01" }}
              />
              <TextField
                required
                fullWidth
                label="Unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. service, pc, wash, rinse, dry, kilo"
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={handleCloseModal} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Service'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default Services;
