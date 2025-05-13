import React, { useState, FormEvent, ChangeEvent } from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  SelectChangeEvent,
  Stack,
  Box,
} from "@mui/material";
import { 
  AlertCircle, 
  Wrench,
  Home, 
  Zap, 
  Droplet, 
  RockingChair, 
  Brush, 
  MoreHorizontal, 
  Send 
} from "lucide-react";

// Define interfaces for our issue types
interface BaseIssue {
  roomNumber: string;
  issueType: string;
  description?: string;
}

interface MaintenanceIssue extends BaseIssue {
  category: string;
}

interface ComplaintIssue extends BaseIssue {
  category: null;
}

type Issue = MaintenanceIssue | ComplaintIssue;

const IssueForm: React.FC = () => {
  const [issueType, setIssueType] = useState<string>("");
  const [roomNumber, setRoomNumber] = useState<string>("");
  const [category, setCategory] = useState<string>("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newIssue: Issue = {
      roomNumber: roomNumber,
      issueType: issueType,
      category: issueType === "maintenance" ? category : null,
      // Add other fields as necessary
    };
    // Add logic to submit the new issue
    console.log("Submitting issue:", newIssue);
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormControl fullWidth margin="normal">
        <InputLabel>Issue Type</InputLabel>
        <Select
          value={issueType}
          onChange={(e: SelectChangeEvent) => setIssueType(e.target.value)}
          startAdornment={
            issueType === "complaint" ? (
              <Box sx={{ mr: 1 }}><AlertCircle size={20} /></Box>
            ) : issueType === "maintenance" ? (
              <Box sx={{ mr: 1 }}><Wrench size={20} /></Box>
            ) : null
          }
        >
          <MenuItem value="complaint">
            <Stack direction="row" alignItems="center" spacing={1}>
              <AlertCircle size={18} /> Complaint
            </Stack>
          </MenuItem>
          <MenuItem value="maintenance">
            <Stack direction="row" alignItems="center" spacing={1}>
              <Wrench size={18} /> Maintenance
            </Stack>
          </MenuItem>
        </Select>
      </FormControl>

      <TextField
        label="Room Number"
        fullWidth
        margin="normal"
        value={roomNumber}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setRoomNumber(e.target.value)}
        required
        InputProps={{
          startAdornment: <Box sx={{ mr: 1 }}><Home size={20} /></Box>,
        }}
      />

      {issueType === "maintenance" && (
        <FormControl fullWidth margin="normal">
          <InputLabel>Maintenance Category</InputLabel>
          <Select
            value={category}
            onChange={(e: SelectChangeEvent) => setCategory(e.target.value)}
          >
            <MenuItem value="electrical">
              <Stack direction="row" alignItems="center" spacing={1}>
                <Zap size={18} /> Electrical
              </Stack>
            </MenuItem>
            <MenuItem value="plumbing">
              <Stack direction="row" alignItems="center" spacing={1}>
                <Droplet size={18} /> Plumbing
              </Stack>
            </MenuItem>
            <MenuItem value="furniture">
              <Stack direction="row" alignItems="center" spacing={1}>
                <RockingChair size={18} /> Furniture
              </Stack>
            </MenuItem>
            <MenuItem value="cleaning">
              <Stack direction="row" alignItems="center" spacing={1}>
                <Brush size={18} /> Cleaning
              </Stack>
            </MenuItem>
            <MenuItem value="other">
              <Stack direction="row" alignItems="center" spacing={1}>
                <MoreHorizontal size={18} /> Other
              </Stack>
            </MenuItem>
          </Select>
        </FormControl>
      )}

      <Button 
        type="submit" 
        variant="contained" 
        color="primary"
        startIcon={<Send size={18} />}
      >
        Submit Issue
      </Button>
    </form>
  );
};

export default IssueForm;