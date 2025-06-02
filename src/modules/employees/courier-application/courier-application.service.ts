import { AddressService } from "../../address";
import { PasswordResetTokenService } from "../../authentication";
import { EmailService } from "../../email";
import { UserService } from "../../users";
import { UserRoleService } from "../../users/user-role/user-role.service";
import { EmployeeRow, EmployeeWithRelationsRow } from "../employee.table";
import { Courier } from "./courier";
import { CourierApplicationRepository } from "./courier-application.repository";
import { CourierApplicationRequest, CreateCourierApplicationResponse, EmployeeResponse } from "./courier.schema";

export interface CourierApplicationService {
    submitApplication(application: CourierApplicationRequest): Promise<CreateCourierApplicationResponse>;
    findAllApplications(options?: { offset?: number; limit?: number; filters?: {
            status?: string;
            name?: string;
            user_email?: string;
        }}): Promise<{ applications: EmployeeResponse[], count: number }>;
    findApplicationById(id: number): Promise<EmployeeResponse | null>;
    updateApplication(id: number, application: Partial<EmployeeRow>): Promise<EmployeeRow>;
    deleteApplication(id: number): Promise<void>;
}

export function createCourierApplicationService(repository: CourierApplicationRepository, userService: UserService, addressService: AddressService, emailService: EmailService, passwordResetService: PasswordResetTokenService, userRoleService: UserRoleService): CourierApplicationService {
    return {
        submitApplication: async function (application: CourierApplicationRequest): Promise<CreateCourierApplicationResponse> {
            const user = await userService.createCourierUser({
                first_name: application.personal_details.first_name,
                last_name: application.personal_details.last_name,
                email: application.personal_details.email,
                phone_number: application.personal_details.phone_number,
            });

            const addressId = await addressService.createAddress({
                street: application.personal_details.address.street,
                address_detail: application.personal_details.address.address_detail,
                postal_code: application.personal_details.address.postal_code,
                city: application.personal_details.address.city,
                country: application.personal_details.address.country,
                latitude: application.personal_details.address.latitude,
                longitude: application.personal_details.address.longitude,
            });

            const courier = await repository.create({
                user_id: user.id,
                vehicle_type_id: application.vehicle_type_id,
                address_id: addressId,
                schedule_preference_id: application.schedule_preference,
                hours_preference_id: application.hours_preference,
                data_retention_consent: application.data_retention_consent,
                is_eighteen_plus: application.personal_details.is_eighteen_plus,
                status: application.personal_details.status,
            });

            await emailService.sendCourierApplicationStatusEmail(
                application.personal_details.email,
                'received',
                `${application.personal_details.first_name} ${application.personal_details.last_name}`,
                { applicationId: courier.id }
            );

            return {
                message: "Application submitted successfully",
                status: "pending",
                id: courier.id,
                next_steps: "We will review your application shortly."
            };
        },
        findAllApplications: async function (options?: {
            offset?: number;
            limit?: number;
            filters?: {
                name?: string;
                user_email?: string;
                status?: string; };
        }): Promise<{ applications: EmployeeResponse[], count: number, limit?: number, offset?: number }> {
            const {applications, count} = await repository.findAll(options);
            const response = applications.map(courierRowToCourier);
            return {
                applications: response,
                count: count,
                limit: options?.limit,
                offset: options?.offset
            };
        },
        findApplicationById: async function (id: number): Promise<EmployeeResponse | null> {
            const application = await repository.findById(id);
            if (!application) {
                return null;
            }
            return courierRowToCourier(application);
        },
        updateApplication: async function (id: number, application: Partial<EmployeeRow>): Promise<EmployeeRow> {
            const currentApplication = await repository.findById(id);
            if (!currentApplication) {
                throw new Error(`Application with ID ${id} not found`);
            }

            const updatedApplication = await repository.update(id, application);

            if (application.status === 'approved' && currentApplication.status !== 'approved') {
                try {
                    await userService.assignRoleToUserSimple(updatedApplication.user_id, 'courier');
                    console.log(`Courier role assigned to user ${updatedApplication.user_id} for application ${id}`);
                } catch (error) {
                    console.error(`Failed to assign courier role to user ${updatedApplication.user_id}:`, error);
                }
            }else{
                if(updatedApplication.status == 'approved'){

                    const resetToken = await passwordResetService.generateResetTokenWithoutEmail(currentApplication.email);
                    const userHasPartnerRole = await userRoleService.hasRole(currentApplication.user_id, 'courier');
                            
                    if (!userHasPartnerRole) {
                        await userRoleService.assignRoleToUser(currentApplication.user_id, 'courier');
                    }
                    await emailService.sendCourierApplicationStatusEmail(
                        currentApplication.email,
                        'approved',
                        `${currentApplication.first_name} ${currentApplication.last_name}`,
                        { applicationId: currentApplication.id, setupToken: resetToken }
                    );
                }else {
                    await emailService.sendCourierApplicationStatusEmail(
                        currentApplication.email,
                        'rejected',
                        `${currentApplication.first_name} ${currentApplication.last_name}`,
                        { applicationId: currentApplication.id }
                    );
                }
            }
            return updatedApplication;
        },
        deleteApplication: async function (id: number): Promise<void> {
            await repository.delete(id);
        },
    }
}

export function courierRowToCourier(courier: EmployeeWithRelationsRow): EmployeeResponse {
    return {
        id: courier.id,
        user: {
            id: courier.user_id,
            first_name: courier.first_name,
            last_name: courier.last_name,
            email: courier.email,
            phone_number: courier.phone_number,
            is_eighteen_plus: courier.is_eighteen_plus,
        },
        vehicle_type: {
            id: courier.vehicle_type_id,
            name: courier.vehicle_type_name,
        },
        schedule_preference: {
            id: courier.schedule_preference_id,
            name: courier.schedule_preference_name,
        },
        hours_preference: {
            id: courier.hours_preference_id,
            name: courier.hours_preference_name,
        },
        address: {
            id: courier.address_id,
            address_detail: courier.address_detail,
            street: courier.street_name,
            postal_code: courier.postal_code,
            city: courier.city_name,
            country: courier.country_name,
            country_iso: courier.country_iso,
        },
        documentation: (courier.employee_documentation || []).map(doc => ({
            id: doc.id,
            document_type: doc.document_type,
            document_number: doc.document_number || undefined,
            issue_date: doc.issue_date ? new Date(doc.issue_date).toISOString().split('T')[0] : undefined,
            expiry_date: doc.expiry_date ? new Date(doc.expiry_date).toISOString().split('T')[0] : undefined,
            verification_status: doc.verification_status || 'not_submitted',
            verified_by: doc.verified_by || undefined,
            verification_date: doc.verification_date ? new Date(doc.verification_date).toISOString() : undefined,
            document_url: doc.document_url || undefined,
        })),
    }
}