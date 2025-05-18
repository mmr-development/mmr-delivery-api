import { TimeEntryRepository } from './time-entry.repository';
import { TimeEntryRow } from './time-entry.types';

export interface TimeEntryService {
  clockIn(courierId: string): Promise<TimeEntryRow>;
  clockOut(courierId: string): Promise<TimeEntryRow | null>;
  getActiveTimeEntry(courierId: string): Promise<TimeEntryRow | undefined>;
  getAllTimeEntries(courierId: string): Promise<TimeEntryRow[]>;
}

export const createTimeEntryService = (timeEntryRepository: TimeEntryRepository): TimeEntryService => {
  return {
    async clockIn(courierId: string): Promise<TimeEntryRow> {
      // First find employee ID from user ID
      const employee = await timeEntryRepository.findEmployeeByUserId(courierId);
      if (!employee) {
        throw new Error('Employee not found');
      }
      
      // Check if already clocked in
      const activeEntry = await timeEntryRepository.findActiveTimeEntry(employee.id);
      if (activeEntry) {
        throw new Error('Already clocked in');
      }
      
      return await timeEntryRepository.createTimeEntry(employee.id);
    },
    
    async clockOut(courierId: string): Promise<TimeEntryRow | null> {
      // Find employee ID from user ID
      const employee = await timeEntryRepository.findEmployeeByUserId(courierId);
      if (!employee) {
        throw new Error('Employee not found');
      }
      
      const activeEntry = await timeEntryRepository.findActiveTimeEntry(employee.id);
      if (!activeEntry) {
        throw new Error('Not clocked in');
      }
      
      return await timeEntryRepository.closeTimeEntry(activeEntry.id);
    },
    
    async getActiveTimeEntry(courierId: string): Promise<TimeEntryRow | undefined> {
      const employee = await timeEntryRepository.findEmployeeByUserId(courierId);
      if (!employee) {
        return undefined;
      }
      
      return await timeEntryRepository.findActiveTimeEntry(employee.id);
    },
    
    async getAllTimeEntries(courierId: string): Promise<TimeEntryRow[]> {
      return await timeEntryRepository.findAllTimeEntries(courierId);
    }
  };
};
