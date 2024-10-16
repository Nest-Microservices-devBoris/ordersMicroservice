import { PaginationDto } from "src/common";
import { OrderStatusList } from "../enum/order.enum";
import { IsEnum, IsOptional } from "class-validator";
import { OrderStatus } from "@prisma/client";

export class OrderPaginationDto extends PaginationDto {
    
    @IsOptional()
    @IsEnum(OrderStatus, {
        message: `Invalid order status ${OrderStatusList}`})
    status?: OrderStatus
}