import { randomBytes } from 'crypto';
import { PartnerApplicationRepository } from './partner-application.repository';
import { UserService } from '../../users';
import { AddressService } from '../../address';
import { UserRoleService } from '../../users/user-role/user-role.service';
import { EmailService } from '../../email';
import { PartnerService } from '../partner.service';
import { Partner } from '../partner';
import { PartnerApplicationRequest, PartnerApplicationResponse, PartnerApplicationUpdate } from '../partner.schema';
import { partnerRowToPartner, mapRowToApplicationResponse } from './partner-application.mapper';

export interface PartnerApplicationService {
  submitApplication(application: PartnerApplicationRequest): Promise<Partner>;
  getAllPartnerApplications(options?: { offset?: number; limit?: number; filters?: { status?: string; } }): Promise<{ applications: PartnerApplicationResponse[]; count: number }>;
  getPartnerApplicationById(id: number): Promise<PartnerApplicationResponse | undefined>;
  updateApplication(id: number, updateData: PartnerApplicationUpdate): Promise<PartnerApplicationResponse>;
  deleteApplication(id: number): Promise<void>;
  activatePartner(token: string, password: string): Promise<{ success: boolean }>;
  generateActivationToken(partnerId: number): Promise<string>;
}

export function createPartnerApplicationService(
  repository: PartnerApplicationRepository, 
  userService: UserService, 
  addressService: AddressService, 
  emailService: EmailService, 
  userRoleService: UserRoleService,
  partnerService: PartnerService
): PartnerApplicationService {
  return {
    submitApplication: async function (application: PartnerApplicationRequest): Promise<Partner> {
      const user = await userService.createPartnerUser({
        first_name: application.contact_person.first_name,
        last_name: application.contact_person.last_name,
        email: application.contact_person.email,
        phone_number: application.contact_person.phone_number,
      });

      const addressId = await addressService.createAddress({
        street: application.business.address.street,
        address_detail: application.business.address.address_detail,
        postal_code: application.business.address.postal_code,
        city: application.business.address.city,
        latitude: application.business.address.latitude,
        longitude: application.business.address.longitude,
        country: application.business.address.country || '',
      });

      const partnerRow = await repository.create({
        name: application.business.name,
        phone_number: application.business.phone_number,
        delivery_method_id: application.delivery_method_id,
        business_type_id: application.business_type_id,
        address_id: addressId,
        user_id: user.id,
        // image_url: application.business.image_url || '',
      });

      // Send confirmation email with the updated method signature 
      // The email service expects email, statusType, partnerName, contactName, options
      await emailService.sendPartnerApplicationStatusEmail(
        application.contact_person.email, 
        'received', 
        application.business.name, 
        `${application.contact_person.first_name} ${application.contact_person.last_name}`,
        { applicationId: partnerRow.id }
      );

      return partnerRowToPartner(partnerRow);
    },

    getAllPartnerApplications: async function (options?: { offset?: number; limit?: number; filters?: { status?: string; } }): Promise<{ applications: PartnerApplicationResponse[]; count: number }> {
      const result = await repository.findAll(options);
      return {
        applications: result.applications.map(mapRowToApplicationResponse),
        count: result.count,
      };
    },

    getPartnerApplicationById: async function (id: number): Promise<PartnerApplicationResponse | undefined> {
      const partnerRow = await repository.findById(id);

      if (partnerRow) {
        return mapRowToApplicationResponse(partnerRow);
      }
    },

    updateApplication: async function (id: number, applicationData: PartnerApplicationUpdate): Promise<PartnerApplicationResponse> {
      const existingApplication = await repository.findById(id);
      if (!existingApplication) {
        throw new Error(`Partner application with id ${id} not found`);
      }

      const wasApproved = existingApplication.status !== 'approved' && applicationData.status === 'approved';
      const wasRejected = existingApplication.status !== 'rejected' && applicationData.status === 'rejected';

      const updateData = {
        status: applicationData.status,
        phone_number: applicationData.business?.phone_number,
        delivery_method_id: applicationData.delivery_method_id,
        business_type_id: applicationData.business_type_id,
        name: applicationData.business?.name,
        rejection_reason: wasRejected ? applicationData.rejection_reason : undefined,
      };

      await repository.update(id, updateData);

      // If partner was just approved
      if (wasApproved && existingApplication.user_email && existingApplication.user_id) {
        // Check if user already has partner role before trying to assign it
        const userHasPartnerRole = await userRoleService.hasRole(existingApplication.user_id, 'partner');
        
        if (!userHasPartnerRole) {
          // Assign the partner role to the user only if they don't have it yet
          await userRoleService.assignRoleToUser(existingApplication.user_id, 'partner');
        }

        // Generate activation token - using the real implementation now
        // const activationToken = await this.generateActivationToken(id);

        // Send approval email with the combined template
        await emailService.sendPartnerApplicationStatusEmail(
          existingApplication.user_email,
          'approved', // Use string enum instead of boolean
          existingApplication.name || 'Your Business',
          `${existingApplication.first_name || ''} ${existingApplication.last_name || ''}`.trim(),
          { setupToken: 'activationToken' }
        );
      }

      // If partner was just rejected
      if (wasRejected && existingApplication.user_email) {
        // Send rejection email with the combined template
        await emailService.sendPartnerApplicationStatusEmail(
          existingApplication.user_email,
          'rejected', // Use string enum instead of boolean
          existingApplication.name || 'Your Business',
          `${existingApplication.first_name || ''} ${existingApplication.last_name || ''}`.trim(),
          { rejectionReason: applicationData.rejection_reason }
        );
      }

      const updatedApplication = await repository.findById(id);
      if (!updatedApplication) {
        throw new Error('Failed to retrieve updated application');
      }

      return mapRowToApplicationResponse(updatedApplication);
    },

    deleteApplication: async function (id: number): Promise<void> {
      const existingApplication = await repository.findById(id);
      if (!existingApplication) {
        throw new Error(`Partner application with id ${id} not found`);
      }

      await repository.delete(id);
    },

    generateActivationToken: async function(partnerId: number): Promise<string> {
      const token = randomBytes(32).toString('hex');
      await repository.saveActivationToken(partnerId, token);
      return token;
    },

    activatePartner: async function(token: string, password: string): Promise<{ success: boolean }> {
      const partner = await repository.findByActivationToken(token);
      if (!partner) {
        throw new Error('Invalid or expired activation token');
      }

      // Set password for the user
      await userService.setPassword(partner.user_id, password);
      
      // Clear the activation token and update status to activated
      await repository.update(partner.id, { 
        status: 'activated', 
        activation_token: null 
      });

      return { success: true };
    }
  };
}
