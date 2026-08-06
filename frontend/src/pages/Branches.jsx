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
  Alert,
  IconButton,
  Stack,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Store as BranchIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';

const parseMachinesConfig = (config) => {
  if (!config) {
    return [
      { tempId: 1, name: 'Machine 1', available: true },
      { tempId: 2, name: 'Machine 2', available: true },
      { tempId: 3, name: 'Machine 3', available: true },
      { tempId: 4, name: 'Machine 4', available: true }
    ];
  }
  return config.split(',').map((item, idx) => {
    const parts = item.split(':');
    if (parts.length >= 2) {
      return {
        tempId: idx + 1,
        name: parts[0].trim(),
        available: parts[1].trim().toLowerCase() === 'true'
      };
    } else if (parts.length > 0 && parts[0].trim()) {
      return {
        tempId: idx + 1,
        name: parts[0].trim(),
        available: true
      };
    }
    return null;
  }).filter(item => item !== null);
};

const serializeMachinesConfig = (machines) => {
  return machines.map(m => `${m.name}:${m.available}`).join(',');
};

const Branches = () => {
  const { isAdmin } = useAuth();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dialog Form States
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  
  const [branchName, setBranchName] = useState('');
  const [location, setLocation] = useState('');
  const [machinesList, setMachinesList] = useState([]);
  
  const [selectedBranch, setSelectedBranch] = useState(null);
  
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBranches = async () => {
    try {
      const response = await api.get('/api/branches');
      setBranches(response.data);
    } catch (err) {
      setError('Failed to fetch branches. Check connection.');
      console.error(err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    await fetchBranches();
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddModal = () => {
    setFormError('');
    setBranchName('');
    setLocation('');
    setMachinesList([
      { tempId: 1, name: 'Machine 1', available: true },
      { tempId: 2, name: 'Machine 2', available: true },
      { tempId: 3, name: 'Machine 3', available: true },
      { tempId: 4, name: 'Machine 4', available: true }
    ]);
    setOpenAddModal(true);
  };

  const handleCloseAddModal = () => setOpenAddModal(false);

  const handleOpenEditModal = (branch) => {
    setFormError('');
    setSelectedBranch(branch);
    setBranchName(branch.name);
    setLocation(branch.location);
    setMachinesList(parseMachinesConfig(branch.machinesConfig));
    setOpenEditModal(true);
  };

  const handleCloseEditModal = () => setOpenEditModal(false);

  const handleAddMachine = () => {
    const nextId = machinesList.length > 0 ? Math.max(...machinesList.map(m => m.tempId)) + 1 : 1;
    setMachinesList([
      ...machinesList,
      { tempId: nextId, name: `Machine ${machinesList.length + 1}`, available: true }
    ]);
  };

  const handleRemoveMachine = (index) => {
    setMachinesList(machinesList.filter((_, i) => i !== index));
  };

  const handleMachineNameChange = (index, value) => {
    setMachinesList(machinesList.map((m, i) => i === index ? { ...m, name: value } : m));
  };

  const handleMachineAvailabilityChange = (index, checked) => {
    setMachinesList(machinesList.map((m, i) => i === index ? { ...m, available: checked } : m));
  };

  const handleAddBranch = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!branchName.trim() || !location.trim()) {
      setFormError('Please fill in both branch name and location.');
      return;
    }

    if (machinesList.length === 0) {
      setFormError('Please configure at least one washing machine.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/branches', {
        name: branchName.trim(),
        location: location.trim(),
        machinesConfig: serializeMachinesConfig(machinesList)
      });
      handleCloseAddModal();
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create branch.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateBranch = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!branchName.trim() || !location.trim()) {
      setFormError('Please fill in both branch name and location.');
      return;
    }

    if (machinesList.length === 0) {
      setFormError('Please configure at least one washing machine.');
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/api/branches/${selectedBranch.id}`, {
        name: branchName.trim(),
        location: location.trim(),
        machinesConfig: serializeMachinesConfig(machinesList)
      });
      handleCloseEditModal();
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to update branch.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBranch = async (id) => {
    if (!window.confirm('Are you sure you want to delete this branch? All employee and transaction links to this branch will be nullified.')) {
      return;
    }
    try {
      await api.delete(`/api/branches/${id}`);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete branch.');
      console.error(err);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Top Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
          Branch Location Directory
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={loadData} color="primary" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <RefreshIcon />
          </IconButton>
          {isAdmin() && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenAddModal}
              sx={{ fontWeight: 'bold' }}
            >
              Create Branch
            </Button>
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Branches Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto', borderRadius: 0 }}>
              <Table>
                <TableHead sx={{ bgcolor: 'background.default' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Branch Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Physical Address / Location</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Machines Installed</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Established Date</TableCell>
                    {isAdmin() && <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {branches.length > 0 ? (
                    branches.map((item) => {
                      const parsedMachines = parseMachinesConfig(item.machinesConfig);
                      return (
                        <TableRow key={item.id} hover>
                          <TableCell>#{item.id}</TableCell>
                          <TableCell sx={{ fontWeight: 600, py: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <BranchIcon color="secondary" />
                              {item.name}
                            </Box>
                          </TableCell>
                          <TableCell>{item.location}</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                              {parsedMachines.map((m) => (
                                <Box
                                  key={m.tempId}
                                  sx={{
                                    px: 1,
                                    py: 0.25,
                                    borderRadius: 1,
                                    fontSize: '0.75rem',
                                    fontWeight: 'medium',
                                    border: '1px solid',
                                    borderColor: m.available ? 'success.light' : 'error.light',
                                    color: m.available ? 'success.main' : 'error.main',
                                    bgcolor: m.available ? 'success.lightest' : 'error.lightest',
                                  }}
                                >
                                  {m.name}
                                </Box>
                              ))}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            {item.createdAt 
                              ? new Date(item.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                              : 'Initial System Seed'}
                          </TableCell>
                          {isAdmin() && (
                            <TableCell align="right">
                              <IconButton onClick={() => handleOpenEditModal(item)} color="primary" size="small" sx={{ mr: 1 }}>
                                <EditIcon />
                              </IconButton>
                              <IconButton onClick={() => handleDeleteBranch(item.id)} color="error" size="small">
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={isAdmin() ? 6 : 5} align="center" sx={{ py: 6 }}>
                        <Typography color="text.secondary">No laundry branch locations established yet.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Create Branch Dialog */}
      <Dialog open={openAddModal} onClose={handleCloseAddModal} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <BranchIcon color="primary" />
          Establish New Branch
        </DialogTitle>
        <Box component="form" onSubmit={handleAddBranch}>
          <DialogContent dividers sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
            <Stack spacing={3}>
              <TextField
                required
                fullWidth
                label="Branch Name"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="e.g. North Avenue Express"
              />
              <TextField
                required
                fullWidth
                label="Branch Address"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Brgy. Bagong Pag-asa, Quezon City"
                multiline
                rows={2}
              />
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  Configure Machines
                </Typography>
                <Button size="small" onClick={handleAddMachine} startIcon={<AddIcon />}>
                  Add Machine
                </Button>
              </Box>
              {machinesList.length === 0 ? (
                <Typography variant="caption" color="text.secondary">No machines configured. Add at least one.</Typography>
              ) : (
                <Stack spacing={2}>
                  {machinesList.map((m, idx) => (
                    <Box key={m.tempId} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField
                        required
                        size="small"
                        label="Machine Name"
                        value={m.name}
                        onChange={(e) => handleMachineNameChange(idx, e.target.value)}
                        sx={{ flexGrow: 1 }}
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={m.available}
                            onChange={(e) => handleMachineAvailabilityChange(idx, e.target.checked)}
                          />
                        }
                        label="Active"
                        sx={{ mr: 0 }}
                      />
                      <IconButton size="small" onClick={() => handleRemoveMachine(idx)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={handleCloseAddModal} color="inherit">Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              startIcon={submitting && <CircularProgress size={16} color="inherit" />}
            >
              Establish Branch
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Edit Branch Dialog */}
      <Dialog open={openEditModal} onClose={handleCloseEditModal} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <BranchIcon color="primary" />
          Configure Branch Details
        </DialogTitle>
        <Box component="form" onSubmit={handleUpdateBranch}>
          <DialogContent dividers sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
            <Stack spacing={3}>
              <TextField
                required
                fullWidth
                label="Branch Name"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="e.g. North Avenue Express"
              />
              <TextField
                required
                fullWidth
                label="Branch Address"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Brgy. Bagong Pag-asa, Quezon City"
                multiline
                rows={2}
              />
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  Configure Machines
                </Typography>
                <Button size="small" onClick={handleAddMachine} startIcon={<AddIcon />}>
                  Add Machine
                </Button>
              </Box>
              {machinesList.length === 0 ? (
                <Typography variant="caption" color="text.secondary">No machines configured. Add at least one.</Typography>
              ) : (
                <Stack spacing={2}>
                  {machinesList.map((m, idx) => (
                    <Box key={m.tempId} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField
                        required
                        size="small"
                        label="Machine Name"
                        value={m.name}
                        onChange={(e) => handleMachineNameChange(idx, e.target.value)}
                        sx={{ flexGrow: 1 }}
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={m.available}
                            onChange={(e) => handleMachineAvailabilityChange(idx, e.target.checked)}
                          />
                        }
                        label="Active"
                        sx={{ mr: 0 }}
                      />
                      <IconButton size="small" onClick={() => handleRemoveMachine(idx)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={handleCloseEditModal} color="inherit">Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              startIcon={submitting && <CircularProgress size={16} color="inherit" />}
            >
              Save Changes
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default Branches;
