import React, { useState, useEffect } from "react";
import {
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Paper,
  Chip,
  Divider,
  Box,
  CircularProgress
} from "@mui/material";
import { 
  AlertCircle, 
  Wrench, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Hourglass
} from "lucide-react";

// Reuse the same Issue type definition from IssueForm
interface BaseIssue {
  id: string;
  roomNumber: string;
  issueType: string;
  description?: string;
  status: "pending" | "in-progress" | "resolved" | "rejected";
  createdAt: string;
}

interface MaintenanceIssue extends BaseIssue {
  category: string;
}

interface ComplaintIssue extends BaseIssue {
  category: null;
}

type Issue = MaintenanceIssue | ComplaintIssue;

interface IssueListProps {
  studentId?: string;
}

const IssueList: React.FC<IssueListProps> = ({ studentId }) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        // Replace with actual API call
        setLoading(true);
        // Example API call: const data = await fetch(`/api/issues?studentId=${studentId}`).then(res => res.json());
        // Mock data for now
        const mockData: Issue[] = [
          {
            id: "1",
            roomNumber: "301",
            issueType: "maintenance",
            category: "electrical",
            description: "Light fixture not working",
            status: "pending",
            createdAt: new Date().toISOString()
          },
          {
            id: "2",
            roomNumber: "301",
            issueType: "complaint",
            category: null,
            description: "Noise from neighboring room",
            status: "in-progress",
            createdAt: new Date().toISOString()
          }
        ];
        
        setIssues(mockData);
      } catch (err) {
        setError("Failed to fetch issues");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchIssues();
  }, [studentId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock size={20} color="#f59e0b" />;
      case "in-progress":
        return <Hourglass size={20} color="#3b82f6" />;
      case "resolved":
        return <CheckCircle2 size={20} color="#10b981" />;
      case "rejected":
        return <XCircle size={20} color="#ef4444" />;
      default:
        return <Clock size={20} />;
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <Paper elevation={2}>
      <Typography variant="h6" p={2}>
        Your Issues
      </Typography>
      <Divider />
      
      {issues.length === 0 ? (
        <Box p={3} textAlign="center">
          <Typography color="textSecondary">No issues found</Typography>
        </Box>
      ) : (
        <List>
          {issues.map((issue) => (
            <ListItem key={issue.id} sx={{ borderBottom: "1px solid #eee" }}>
              <ListItemIcon>
                {issue.issueType === "maintenance" ? (
                  <Wrench size={24} />
                ) : (
                  <AlertCircle size={24} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body1" fontWeight="medium">
                    {issue.issueType === "maintenance" 
                      ? `Maintenance: ${issue.category}` 
                      : "Complaint"}
                  </Typography>
                }
                secondary={
                  <>
                    <Typography variant="body2" component="span">
                      Room: {issue.roomNumber}
                    </Typography>
                    <br />
                    <Typography variant="body2" component="span">
                      {issue.description}
                    </Typography>
                  </>
                }
              />
              <Box display="flex" flexDirection="column" alignItems="center" mr={1}>
                <Chip
                  icon={getStatusIcon(issue.status)}
                  label={issue.status.replace("-", " ")}
                  size="small"
                  color={
                    issue.status === "resolved" 
                      ? "success" 
                      : issue.status === "rejected" 
                        ? "error" 
                        : "default"
                  }
                  sx={{ textTransform: 'capitalize', mb: 1 }}
                />
                <Typography variant="caption" color="textSecondary">
                  {new Date(issue.createdAt).toLocaleDateString()}
                </Typography>
              </Box>
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default IssueList;
