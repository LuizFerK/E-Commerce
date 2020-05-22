import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import IUpdateProductsQuantityDTO from '@modules/products/dtos/IUpdateProductsQuantityDTO';
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

    const productsId = products.map(product => ({ id: product.id }));

    const allProducts = await this.productsRepository.findAllById(productsId);

    if (allProducts.length !== productsId.length) {
      throw new AppError('One or more products was not found');
    }

    const updateQuantity: IUpdateProductsQuantityDTO[] = [];

    const orderProducts = allProducts.map(product => {
      const findProduct = products.find(
        productsRequest => productsRequest.id === product.id,
      );

      if (findProduct) {
        if (product.quantity < findProduct.quantity) {
          throw new AppError(
            `Product ${product.name} has insufficient quantity for your order. Quantity available in stock: ${findProduct.quantity}`,
          );
        }

        updateQuantity.push({
          id: findProduct.id,
          quantity: product.quantity - findProduct.quantity,
        });

        return {
          ...product,
          quantity: findProduct.quantity,
        };
      }

      return product;
    });

    await this.productsRepository.updateQuantity(updateQuantity);

    const order = await this.ordersRepository.create({
      customer,
      products: orderProducts.map(product => ({
        product_id: product.id,
        price: product.price,
        quantity: product.quantity,
      })),
    });

    return order;
  }
}

export default CreateProductService;
