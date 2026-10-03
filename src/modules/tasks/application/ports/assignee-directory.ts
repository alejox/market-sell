/** Who can be assigned a task: the members of the client. Implemented by the team module's adapter. */
export interface AssigneeDirectory {
  isMember(clientId: string, userId: string): Promise<boolean>;
}
