import { Catch, ArgumentsHost, ExceptionFilter, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

@Catch(RpcException)
export class RpcCustomExceptionFilter implements ExceptionFilter {
  
  private readonly logger = new Logger(RpcCustomExceptionFilter.name);
  
  catch(exception: RpcException, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse();
    const rpcError = exception.getError();

    this.logger.error('Error RPC: ', rpcError);

    if (typeof rpcError === 'object' && 'status' in rpcError && 'message' in rpcError) {
      const status = isNaN(+rpcError.status) ? 400 : +rpcError.status;
      return response.status(status).json({
        statusCode: status,
        message: rpcError.message || 'An unexpected error occurred',
      });
    }

    // Si no tiene la estructura esperada del error, devolvemos una respuesta genérica
    return response.status(400).json({
      statusCode: 400,
      message: 'An unexpected error occurred',
    });
  }
}
