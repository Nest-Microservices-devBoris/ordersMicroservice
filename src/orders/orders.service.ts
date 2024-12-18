import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaClient } from '@prisma/client';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ChangeOrderStatusDto, OrderPaginationDto, PaidOrderDto } from './dto';
import { NATS_SERVICE } from 'src/config';
import { firstValueFrom } from 'rxjs';
import { OrderWithProducts } from './interfaces/order-with-products.interface';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  
  constructor(@Inject(NATS_SERVICE) private  readonly client:ClientProxy) {
    super();
  }
  private readonly logger = new Logger('OrdersService');

  async onModuleInit() {
    await this.$connect(); 
    this.logger.log('Connected to database');
  }


  
  async create(createOrderDto: CreateOrderDto) {

    try {
      // confirm that all products exist
      const productIds = createOrderDto.items.map(item => item.productId);

      const products: any[] = await firstValueFrom(
  
        this.client.send({ cmd: 'validate_products'}, productIds)
      )

      // calculate total amount and total items
      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => 
        {
          const price = products.find(product => product.id === orderItem.productId).price;
          return acc + (orderItem.quantity * price);
        }, 0);
      
      const totalItems = createOrderDto.items.reduce((acc, orderItem) => 
        {
          return acc + orderItem.quantity;
        }, 0);

      const order = await this.order.create({
        data: {
          totalAmount: totalAmount,
          totalItems: totalItems,
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map(orderItem => ({
                productId: orderItem.productId,
                quantity: orderItem.quantity,
                price: products.find(product => product.id === orderItem.productId).price
              }))
            }
          }
        },
        include: {
          OrderItem: {
            select: {
              productId: true,
              quantity: true,
              price: true
            }
          }
        }
      });

      return {
        ...order,
        OrderItem: order.OrderItem.map(orderItem => ({
          ...orderItem,
          name: products.find(product => product.id === orderItem.productId).name
        }))
      }

      
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {

    const totalPages = await this.order.count({
      where: {
        status: orderPaginationDto.status
      }
    });

    const currentPage = orderPaginationDto.page;
    const perPage = orderPaginationDto.limit;

    return {
      data: await this.order.findMany({
        skip: (currentPage - 1) * perPage,
        take: perPage,
        where: {
          status: orderPaginationDto.status
        }

      }),
      meta: {
        total: totalPages,
        page: currentPage,
        lastPage: Math.ceil(totalPages / perPage)
      }
    }
  }

  async findOne(id: string) {

    const order = await this.order.findFirst({
      where: {id},
      include: {
        OrderItem: {
          select: {
            productId: true,
            price: true,
            quantity: true,
          }
        }
      }
    });

    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Order with id ${id} not found`,
      });
    }

    const productIds = order.OrderItem.map(orderItem => orderItem.productId);

    const products: any[] = await firstValueFrom(
  
      this.client.send({ cmd: 'validate_products'}, productIds)
    )

    this.logger.log(`Order with id ${id} found`);

    return {
      ...order,
      OrderItem: order.OrderItem.map(orderItem => ({
        ...orderItem,
        name: products.find(product => product.id === orderItem.productId).name
      }))
    }

    
  }

  async changeStatus(changeOrderStatusDto: ChangeOrderStatusDto) {
 
    const { id, status } = changeOrderStatusDto;
    const order = await this.findOne(id);

    if (order.status === status) {
      return order;
      
    }

    return this.order.update({
      where: {id},
      data: {
        status
      }
    });
 
  }
  
  async createPaymentSession(order: OrderWithProducts){

    const paymentSession = await firstValueFrom(
      this.client.send('create.payment.session', {
        orderId: order.id,
        currency: 'usd',
        items: order.OrderItem.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price
        }))

      })
    )

    return paymentSession;

  }

  async paidOrder(paidOrderDto: PaidOrderDto) { 

    this.logger.log('paidOrder');
    this.logger.log(paidOrderDto);

    const { stripePaymentId, orderId, receiptUrl} = paidOrderDto;

    const order = await this.order.update({
      where: {
        id: orderId,
      },
      data: {
        status: 'PAID',
        paid: true,
        paidAt: new Date(),
        stripePaymentId: stripePaymentId,
        OrderReceipt: {
          create: {
            receiptUrl: receiptUrl
          }
        }
      },
    })
    return order;

  }
}
