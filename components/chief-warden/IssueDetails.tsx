import { Typography } from "@mui/material";

// Define interfaces for issue types
interface BaseIssue {
  id: string;
  roomNumber: string;
  type: string; // Note: using 'type' here since that's what's in the original code
  description?: string;
  status?: "pending" | "in-progress" | "resolved" | "rejected";
  createdAt?: string;
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

// Assuming issue is passed as a prop to the component
interface IssueDetailsProps {
  issue: Issue;
}

// The component would look something like this:
const IssueDetails: React.FC<IssueDetailsProps> = ({ issue }) => {
  return (
    <>
      <Typography variant="body1">Room Number: {issue.roomNumber}</Typography>
      {issue.type === 'maintenance' && (
        <Typography variant="body1">Maintenance Category: {issue.category}</Typography>
      )}
    </>
  );
};

export default IssueDetails;