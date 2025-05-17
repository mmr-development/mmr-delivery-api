import { UserService } from '../users/user.service';
import { AddressService } from '../address';
import { CustomerService } from '../customer/customer.service';

interface CustomerData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  address: {
    country: string;
    city: string;
    street: string;
    postal_code: string;
    address_detail?: string;
  };
}

export class CustomerAdapter {
  constructor(
    private userService: UserService,
    private addressService: AddressService,
    private customerService: CustomerService
  ) {}

  async prepareForOrder(customerData: CustomerData): Promise<number> {
    const addressId = await this.addressService.createAddress(customerData.address);
    const user = await this.userService.createCustomerUser(customerData);
    const customer = await this.customerService.createOrFindCustomer({
      user_id: user.id,
      address_id: addressId,
    });
    
    return customer.id;
  }
}
