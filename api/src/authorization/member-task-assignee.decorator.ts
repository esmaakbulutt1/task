import { SetMetadata } from '@nestjs/common';

export const MEMBER_TASK_ASSIGNEE_KEY = 'memberTaskAssignee';

export const MemberTaskAssignee = () =>
  SetMetadata(MEMBER_TASK_ASSIGNEE_KEY, true);
