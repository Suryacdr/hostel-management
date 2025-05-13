import React, { useState, ChangeEvent } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid as MuiGrid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Box,
} from "@mui/material";
import { styled } from '@mui/material/styles';
import { 
  FileText, 
  Wrench, 
  Building, 
  LandPlot,
  DoorClosed,
  Zap,
  ClipboardList,
  CalendarDays 
} from "lucide-react";

// Define types for issue data
interface HostelDetails {
  hostel: string;
  floor: string;
  roomNumber: string;
}

interface BaseIssue {
  id: string;
  type: 'maintenance' | 'complaint';  // Make this a union of literal types
  status: string;
  date: string;
  hostelDetails: HostelDetails;
}

interface MaintenanceIssue extends BaseIssue {
  type: 'maintenance';
  category: string;
}

interface ComplaintIssue extends BaseIssue {
  type: 'complaint';
  category?: never;
}

type Issue = MaintenanceIssue | ComplaintIssue;

interface IssuesListProps {
  issues: Issue[];
}

// Create properly typed Grid components
const Grid = styled(MuiGrid)({});
const GridItem = styled(MuiGrid)({});

// Rename component to match filename
const IssuesList: React.FC<IssuesListProps> = ({ issues }) => {
  const [roomFilter, setRoomFilter] = useState<string>("");
  const [hostelFilter, setHostelFilter] = useState<string>("");
  const [floorFilter, setFloorFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const filteredIssues = issues.filter((issue) => {
    const matchesRoom = roomFilter ? issue.hostelDetails.roomNumber.includes(roomFilter) : true;
    const matchesHostel = hostelFilter ? issue.hostelDetails.hostel === hostelFilter : true;
    const matchesFloor = floorFilter ? issue.hostelDetails.floor === floorFilter : true;
    const matchesType = typeFilter ? issue.type === typeFilter : true;
    
    // Type guard to safely access category property
    const matchesCategory =
      typeFilter === "maintenance" && categoryFilter
        ? (issue as MaintenanceIssue).category === categoryFilter
        : true;

    return matchesRoom && matchesHostel && matchesFloor && matchesType && matchesCategory;
  });

  return (
    <div>
      {/* Filtering options */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <GridItem xs={12} md={3}>
          <TextField
            label="Filter by Room Number"
            value={roomFilter}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setRoomFilter(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: <Box sx={{ mr: 1 }}><DoorClosed size={20} /></Box>,
            }}
          />
        </GridItem>
        <GridItem xs={12} md={3}>
          <TextField
            label="Filter by Hostel"
            value={hostelFilter}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setHostelFilter(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: <Box sx={{ mr: 1 }}><Building size={20} /></Box>,
            }}
          />
        </GridItem>
        <GridItem xs={12} md={3}>
          <TextField
            label="Filter by Floor"
            value={floorFilter}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFloorFilter(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: <Box sx={{ mr: 1 }}><LandPlot size={20} /></Box>,
            }}
          />
        </GridItem>
        <GridItem xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel>Filter by Type</InputLabel>
            <Select
              value={typeFilter}
              onChange={(e: SelectChangeEvent) => setTypeFilter(e.target.value)}
              startAdornment={
                <Box sx={{ mr: 1 }}><ClipboardList size={20} /></Box>
              }
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="complaint">Complaint</MenuItem>
              <MenuItem value="maintenance">Maintenance</MenuItem>
            </Select>
          </FormControl>
        </GridItem>
        {typeFilter === "maintenance" && (
          <GridItem xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Filter by Category</InputLabel>
              <Select
                value={categoryFilter}
                onChange={(e: SelectChangeEvent) => setCategoryFilter(e.target.value)}
                startAdornment={
                  <Box sx={{ mr: 1 }}><Zap size={20} /></Box>
                }
              >
                <MenuItem value="">All Categories</MenuItem>
                <MenuItem value="electrical">Electrical</MenuItem>
                <MenuItem value="plumbing">Plumbing</MenuItem>
                <MenuItem value="furniture">Furniture</MenuItem>
                <MenuItem value="cleaning">Cleaning</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </GridItem>
        )}
      </Grid>

      {/* Issue display table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Hostel</TableCell>
              <TableCell>Floor</TableCell>
              <TableCell>Room Number</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredIssues.length > 0 ? (
              filteredIssues.map((issue) => (
                <TableRow key={issue.id}>
                  <TableCell>{issue.id}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      {issue.type === "maintenance" ? (
                        <><Wrench size={16} style={{ marginRight: 8 }} /> Maintenance</>
                      ) : (
                        <><FileText size={16} style={{ marginRight: 8 }} /> Complaint</>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{issue.hostelDetails.hostel}</TableCell>
                  <TableCell>{issue.hostelDetails.floor}</TableCell>
                  <TableCell>{issue.hostelDetails.roomNumber}</TableCell>
                  <TableCell>
                    {issue.type === "maintenance" 
                      ? (issue as MaintenanceIssue).category 
                      : "N/A"}
                  </TableCell>
                  <TableCell>{issue.status}</TableCell>
                  <TableCell>{issue.date}</TableCell>
                  <TableCell>
                    {/* Action buttons */}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No issues found matching the filters
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

// Change export to match the component name
export default IssuesList;