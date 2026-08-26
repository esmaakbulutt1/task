export type SendEmailJobData =
  | {
      type: 'password-reset';
      recipientEmail: string;
      token: string;
    }
  | {
      type: 'workspace-member-added';
      recipientEmail: string;
      workspaceName: string;
    }
  | {
      type: 'task-assigned';
      recipientEmail: string;
      workspaceName: string;
      projectName: string;
      taskTitle: string;
    }
  | {
      type: 'task-deadline-reminder';
      recipientEmail: string;
      taskTitle: string;
      dueDate: string;
      overdue: boolean;
    };
