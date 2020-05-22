import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateProductService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not found');
    }

    const productsId = products.map(product => {
      return { id: product.id };
    });

    const allProducts = await this.productsRepository.findAllById(productsId);

    const quantity = products.map(product => {
      return product.quantity;
    });

    let i = -1;

    const orderProducts = allProducts.map(product => {
      i += 1;

      if (product.id === undefined) {
        throw new AppError('Product not found');
      }

      if (quantity[i] > product.quantity) {
        throw new AppError(
          'The product that you choose have insufficient quantities for your purchase',
        );
      }

      return {
        product_id: product.id,
        price: product.price,
        quantity: quantity[i],
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: orderProducts,
    });

    return order;
  }
}

export default CreateProductService;
