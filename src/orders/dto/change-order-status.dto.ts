import { Order, OrderStatus } from "@prisma/client";
import { IsEnum, IsUUID } from "class-validator";
import { OrderStatusList } from "../enum/order.enum";


export class ChangeOrderStatusDto {
    
    @IsUUID()
    id: string;

    @IsEnum(OrderStatusList, {
        message: `Invalid order status ${OrderStatusList}`})
    status: OrderStatus;
}