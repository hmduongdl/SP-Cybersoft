export type UserRole = 'admin' | 'manager' | 'member';

export interface TeamMember {
    id: string;
    name: string;
    role: UserRole;
    active: boolean;
}

export interface ScheduleEvent {
    id: string;
    title: string;
    date: string;
    assignee: string;
    status: 'pending' | 'completed' | 'overdue';
}
